import type { Express, Request } from "express";
import { parseCV, parseCVFromPDF } from "../openai";
import { db } from "../db";
import { waitlist } from "@shared/schema";
import { analyserCv } from "../services/lmCvAnalysisService";

/**
 * Lead magnets — outils publics, utilisables sans compte.
 *
 * Ces routes sont volontairement NON authentifiées : elles servent de porte
 * d'entrée. Deux garde-fous en conséquence :
 *   1. un quota par IP, parce qu'un appel = cinq appels IA facturés ;
 *   2. aucune écriture en base — le CV analysé repart au client et n'est
 *      rattaché à un compte qu'au moment de l'inscription. Rien n'est stocké
 *      côté serveur pour quelqu'un qui n'a pas de compte.
 */

// ── Quota par IP ────────────────────────────────────────────────────────────
const FENETRE_MS = 60 * 60 * 1000; // 1 heure
const MAX_PAR_FENETRE = 3;
const compteurs = new Map<string, { debut: number; nb: number }>();

/** En développement, le quota n'a aucun sens : on itère sur le même CV. */
const QUOTA_ACTIF = process.env.NODE_ENV === "production";

function ipDe(req: Request): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) return fwd.split(",")[0].trim();
  return req.ip || "inconnue";
}

function quotaDepasse(ip: string): boolean {
  if (!QUOTA_ACTIF) return false;
  const entree = compteurs.get(ip);
  if (!entree || Date.now() - entree.debut > FENETRE_MS) return false;
  return entree.nb >= MAX_PAR_FENETRE;
}

/**
 * Le compteur n'avance QUE sur une analyse rendue.
 *
 * Décompter à l'entrée paraît plus sûr, mais ça fait payer à la personne les
 * fichiers illisibles et nos propres pannes : elle brûle ses trois essais sans
 * avoir jamais vu un résultat. Un appel IA qui échoue ne nous a rien coûté non
 * plus — il n'y a donc rien à protéger.
 */
function enregistrerAnalyse(ip: string): void {
  if (!QUOTA_ACTIF) return;
  const entree = compteurs.get(ip);
  if (!entree || Date.now() - entree.debut > FENETRE_MS) {
    compteurs.set(ip, { debut: Date.now(), nb: 1 });
    return;
  }
  entree.nb += 1;
}

// Purge périodique pour que la Map ne grossisse pas indéfiniment.
setInterval(() => {
  const maintenant = Date.now();
  for (const [ip, entree] of compteurs) {
    if (maintenant - entree.debut > FENETRE_MS) compteurs.delete(ip);
  }
}, FENETRE_MS).unref();

// ── Extraction du texte du fichier ──────────────────────────────────────────
const TAILLE_MAX_BASE64 = 10_000_000; // ~7,5 Mo binaire
const MIN_CARACTERES = 50;
const SEUIL_PDF_SCANNE = 100;

const ERREURS = {
  trop_gros: {
    error: "file_too_large",
    message: "Ce fichier est trop lourd. Essayez un PDF allégé ou un fichier Word.",
  },
  illisible: {
    error: "file_unreadable",
    message: "Impossible de lire ce fichier. Envoyez un PDF ou un document Word contenant du texte.",
  },
  pdf_scanne: {
    error: "scanned_pdf",
    message:
      "Ce PDF est un scan : il ne contient aucun texte sélectionnable. Exportez votre CV en PDF depuis votre traitement de texte et réessayez.",
  },
  ia_indisponible: {
    error: "ai_unavailable",
    message:
      "L'analyse est momentanément indisponible de notre côté. Ce n'est pas votre fichier : réessayez un peu plus tard.",
  },
};

type Extraction =
  | { ok: true; texte: string; cvParse: any }
  | { ok: false; erreur: typeof ERREURS[keyof typeof ERREURS] };

/**
 * Renvoie DEUX choses, et c'est volontaire :
 *  - `texte` : le texte brut du fichier. C'est lui qu'on note, parce que les
 *    critères ATS et Structure jugent la mise en forme — l'ordre des sections,
 *    les intitulés, les dates. Un CV passé par parseCV() a perdu tout ça.
 *  - `cvParse` : la version structurée, uniquement pour rattacher le CV au
 *    compte si la personne s'inscrit.
 */
async function extraireContenu(buffer: Buffer, mimeType: string | undefined): Promise<Extraction> {
  // PDF
  if (mimeType === "application/pdf") {
    let texte = "";
    try {
      const { pdf: lirePdf } = await import("pdf-parse");
      const donnees = await lirePdf(buffer);
      texte = (donnees.text || "").trim();
    } catch (e) {
      console.warn("[lm/cv] pdf-parse a échoué :", e);
      return { ok: false, erreur: ERREURS.pdf_scanne };
    }

    // Pas de couche texte = PDF scanné : on ne peut rien en dire d'honnête.
    if (texte.length < SEUIL_PDF_SCANNE) return { ok: false, erreur: ERREURS.pdf_scanne };

    // Le pays est passé explicitement : sans lui, le parsing part chez le
    // fournisseur hors UE alors que le reste de l'analyse reste souverain.
    let cvParse: any = null;
    try {
      cvParse = await parseCVFromPDF(buffer, "FR");
    } catch (e) {
      console.warn("[lm/cv] parseCVFromPDF a échoué — le score reste calculable :", e);
    }
    return { ok: true, texte, cvParse };
  }

  // DOCX / texte brut
  let texte = "";
  if (mimeType?.includes("wordprocessingml") || mimeType?.includes("msword")) {
    try {
      const mammoth = await import("mammoth");
      const r = await mammoth.extractRawText({ buffer });
      texte = (r.value || "").trim();
    } catch (e) {
      console.warn("[lm/cv] extraction DOCX impossible :", e);
      return { ok: false, erreur: ERREURS.illisible };
    }
  } else {
    texte = buffer.toString("utf-8").trim();
  }

  if (texte.length < MIN_CARACTERES) return { ok: false, erreur: ERREURS.illisible };

  let cvParse: any = null;
  try {
    cvParse = await parseCV(texte, "FR");
  } catch (e) {
    console.warn("[lm/cv] parseCV a échoué — le score reste calculable :", e);
  }
  return { ok: true, texte, cvParse };
}

/** Aucune clé IA configurée : le dire, plutôt que d'inviter à réessayer en vain. */
function estPanneDeConfiguration(e: any): boolean {
  const message = String(e?.message ?? e ?? "");
  return /API_KEY|apiKey|api key/i.test(message);
}

export function registerLeadMagnetRoutes(app: Express) {
  /**
   * POST /api/lm/cv-analysis
   * Public. Analyse un CV déposé sur les quatre axes Rebond et renvoie le
   * rapport complet. C'est l'écran qui décide de ce qu'il montre : le détail
   * n'apparaît qu'après création de compte.
   */
  app.post("/api/lm/cv-analysis", async (req, res) => {
    try {
      const ip = ipDe(req);
      if (quotaDepasse(ip)) {
        return res.status(429).json({
          error: "rate_limited",
          message:
            "Vous avez déjà analysé 3 CV dans l'heure. Créez votre compte pour continuer sans limite.",
        });
      }

      const { fileData, mimeType, email, consentCv } = req.body ?? {};
      if (!fileData || typeof fileData !== "string") {
        return res.status(400).json({ error: "missing_file", message: "Aucun fichier reçu." });
      }
      if (fileData.length > TAILLE_MAX_BASE64) {
        return res.status(422).json(ERREURS.trop_gros);
      }
      if (typeof email !== "string" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
        return res.status(400).json({
          error: "invalid_email",
          message: "Cette adresse e-mail n'est pas valide.",
        });
      }

      const extraction = await extraireContenu(Buffer.from(fileData, "base64"), mimeType);
      if (!extraction.ok) return res.status(422).json(extraction.erreur);

      const rapport = await analyserCv(extraction.texte);
      enregistrerAnalyse(ip);

      // Le lead n'est enregistré que si la personne a coché le consentement.
      // Sans consentement, l'analyse est rendue mais rien n'est conservé.
      if (consentCv === true) {
        try {
          await db
            .insert(waitlist)
            .values({
              email: email.trim().toLowerCase(),
              firstName: extraction.cvParse?.firstName || "—",
              lastName: extraction.cvParse?.lastName || "—",
              source: "lm-analyse-cv",
            })
            .onConflictDoNothing({ target: waitlist.email });
        } catch (e) {
          // Un lead non enregistré ne doit jamais priver la personne de son rapport.
          console.error("[lm/cv-analysis] enregistrement du lead impossible :", e);
        }
      }

      res.json({
        ...rapport,
        // Renvoyé au client pour être rattaché au compte à l'inscription.
        cvParse: extraction.cvParse,
      });
    } catch (error: any) {
      console.error("[lm/cv-analysis]", error);
      if (estPanneDeConfiguration(error)) {
        return res.status(503).json(ERREURS.ia_indisponible);
      }
      res.status(500).json({
        error: "analysis_failed",
        message: "L'analyse n'a pas abouti. Réessayez dans un instant.",
      });
    }
  });
}
