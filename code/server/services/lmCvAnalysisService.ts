import { aiFactory } from "../ai/factory";
import { pool } from "../db";
import {
  AGENTS_AXES,
  NOTE_MAX_MARQUEUR,
  PROMPT_EFFET_MIROIR,
  type AxeLm,
  type DefinitionAxe,
  type MiroirIA,
  type ReponseAxeIA,
} from "../prompts/lmCv";

/**
 * Analyse de CV du lead magnet — orchestration.
 *
 * Cinq agents tournent en parallèle : un par axe, plus l'effet miroir. Le
 * découpage coûte cinq appels au lieu d'un, mais chaque agent ne regarde qu'une
 * chose : les constats citent le CV au lieu de paraphraser une grille.
 *
 * Aucun score n'est demandé au modèle. Il note des marqueurs de 0 à 3 ; les
 * scores d'axe et le score global sont calculés ici. Deux analyses du même CV
 * donnent donc la même arithmétique, et une note ne peut pas contredire les
 * constats qui l'accompagnent.
 */

export interface Marqueur {
  cle: string;
  libelle: string;
  note: number | null;
  constat: string;
  correctif: string;
}

export interface AxeAnalyse {
  cle: AxeLm;
  libelle: string;
  question: string;
  poids: number;
  score: number;
  verdict: string;
  marqueurs: Marqueur[];
}

export interface ActionPlan {
  rang: number;
  axe: AxeLm;
  titre: string;
  constat: string;
  correctif: string;
}

export interface Miroir {
  ecrit: string;
  percu: string;
  severite: "faible" | "moyenne" | "forte";
  phrase: string;
}

export interface RapportCv {
  scoreGlobal: number;
  metier: string;
  anneesExperience: number | null;
  miroir: Miroir | null;
  axes: AxeAnalyse[];
  planAction: ActionPlan[];
  offresOuvertes: number;
}

// ── Nettoyage de ce que renvoie le modèle ───────────────────────────────────

/**
 * Coupe à la limite, mais sur un mot entier.
 *
 * Un `slice` brut produit « En charge du suivi budg » à l'écran : le lecteur
 * croit à un bug d'affichage plutôt qu'à une citation tronquée.
 */
function texte(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  const t = v.trim();
  if (t.length <= max) return t;
  const coupe = t.slice(0, max);
  const espace = coupe.lastIndexOf(" ");
  return `${(espace > max * 0.6 ? coupe.slice(0, espace) : coupe).replace(/[\s,;:.]+$/, "")}…`;
}

/** Une note hors de 0..3, ou non numérique, vaut « non évalué ». */
function note(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  const n = Math.round(v);
  return n >= 0 && n <= NOTE_MAX_MARQUEUR ? n : null;
}

/**
 * Score d'un axe, sur les seuls marqueurs réellement évalués.
 *
 * Les marqueurs `null` sortent du dénominateur : ne pas pouvoir détecter une
 * information depuis un CV n'est pas la faute de la personne, et la compter
 * comme un zéro ferait chuter le score pour une raison qu'on n'affiche même
 * pas. Un axe entièrement non évalué vaut 0 — le cas ne devrait pas arriver,
 * mais il ne doit pas faire planter le calcul.
 */
function scoreAxe(marqueurs: Marqueur[]): number {
  const notes = marqueurs.map((m) => m.note).filter((n): n is number => n !== null);
  if (notes.length === 0) return 0;
  const total = notes.reduce((s, n) => s + n, 0);
  return Math.round((total / (notes.length * NOTE_MAX_MARQUEUR)) * 100);
}

// ── Un agent ────────────────────────────────────────────────────────────────

async function lancerAxe(def: DefinitionAxe, texteCv: string): Promise<AxeAnalyse> {
  const provider = aiFactory.getProviderForLocation("FR");
  const reponse = await provider.chatJSON<ReponseAxeIA & { metierDetecte?: string; anneesExperience?: number }>(
    [{ role: "user", content: def.prompt + texteCv }],
    { temperature: 0.2 },
  );

  // On reconstruit la liste depuis NOTRE définition, pas depuis la réponse :
  // un marqueur que le modèle aurait oublié doit apparaître comme non évalué,
  // pas disparaître du rapport.
  const parCle = new Map(
    (Array.isArray(reponse?.marqueurs) ? reponse.marqueurs : []).map((m) => [m?.cle, m]),
  );

  const marqueurs: Marqueur[] = def.marqueurs.map(({ cle, libelle }) => {
    const brut = parCle.get(cle);
    return {
      cle,
      libelle,
      note: note(brut?.note),
      constat: texte(brut?.constat, 160) || "Non détectable depuis ce CV.",
      correctif: texte(brut?.correctif, 180),
    };
  });

  const axe: AxeAnalyse = {
    cle: def.cle,
    libelle: def.libelle,
    question: def.question,
    poids: def.poids,
    score: scoreAxe(marqueurs),
    verdict: texte(reponse?.verdict, 220),
    marqueurs,
  };

  // L'agent Complétude porte en plus l'identification du profil.
  (axe as any)._metier = texte(reponse?.metierDetecte, 80);
  (axe as any)._annees =
    typeof reponse?.anneesExperience === "number" && Number.isFinite(reponse.anneesExperience)
      ? Math.max(0, Math.round(reponse.anneesExperience))
      : null;

  return axe;
}

async function lancerMiroir(texteCv: string): Promise<Miroir | null> {
  try {
    const provider = aiFactory.getProviderForLocation("FR");
    const r = await provider.chatJSON<MiroirIA>([{ role: "user", content: PROMPT_EFFET_MIROIR + texteCv }], {
      temperature: 0.4,
    });
    const ecrit = texte(r?.ecrit, 300);
    const percu = texte(r?.percu, 400);
    if (!ecrit || !percu) return null;
    return {
      ecrit,
      percu,
      severite: r?.severite === "forte" || r?.severite === "faible" ? r.severite : "moyenne",
      phrase: texte(r?.phrase, 160),
    };
  } catch (e) {
    // L'effet miroir est le crochet du rapport, pas sa colonne vertébrale.
    // S'il tombe, le reste doit s'afficher quand même.
    console.warn("[lm/cv] effet miroir indisponible :", e);
    return null;
  }
}

// ── Plan d'action, déduit des marqueurs ─────────────────────────────────────

/**
 * Le plan n'est pas demandé au modèle : il se déduit des notes.
 *
 * On classe par manque à gagner réel — l'écart à 3 multiplié par le poids de
 * l'axe. Un marqueur à 0 sur Qualité (35 %) passe donc avant un marqueur à 1
 * sur ATS (20 %), ce qui est exactement l'ordre dans lequel on veut que la
 * personne travaille. Avantage : le plan ne peut jamais contredire les
 * constats affichés juste au-dessus.
 */
function construirePlan(axes: AxeAnalyse[]): ActionPlan[] {
  const candidats = axes.flatMap((axe) =>
    axe.marqueurs
      .filter((m) => m.note !== null && m.note < NOTE_MAX_MARQUEUR && m.correctif)
      .map((m) => ({
        axe: axe.cle,
        titre: m.libelle,
        constat: m.constat,
        correctif: m.correctif,
        gain: (NOTE_MAX_MARQUEUR - (m.note as number)) * axe.poids,
      })),
  );

  return candidats
    .sort((a, b) => b.gain - a.gain)
    .slice(0, 5)
    .map(({ gain, ...reste }, i) => ({ rang: i + 1, ...reste }));
}

// ── Données marché ──────────────────────────────────────────────────────────

const DELAI_MARCHE_MS = 4000;

/**
 * Les chiffres de marché sont un bonus, jamais un point de blocage.
 *
 * Sans ce garde-fou, une base lente ou injoignable suspend la réponse entière :
 * la personne a déjà attendu son analyse, elle reste devant un écran de
 * chargement à cause d'une fourchette de salaire. On préfère rendre le rapport
 * sans le chiffre.
 */
function avecDelai<T>(promesse: Promise<T>, secours: T, quoi: string): Promise<T> {
  return new Promise((resolve) => {
    const minuteur = setTimeout(() => {
      console.warn(`[lm/cv] ${quoi} : délai dépassé, on rend le rapport sans.`);
      resolve(secours);
    }, DELAI_MARCHE_MS);

    promesse
      .then((v) => resolve(v))
      .catch((e) => {
        console.warn(`[lm/cv] ${quoi} indisponible :`, e);
        resolve(secours);
      })
      .finally(() => clearTimeout(minuteur));
  });
}

/**
 * Le nombre d'offres ouvertes sur le métier détecté.
 *
 * C'est le chiffre de l'appel à l'action : « 128 offres correspondent à votre
 * profil ». Il doit être vrai — un chiffre gonflé se retourne contre nous à la
 * seconde où la personne arrive sur la plateforme et n'en trouve que douze.
 */
async function compterOffres(metier: string): Promise<number> {
  const terme = termeRecherche(metier);
  if (!terme) return 0;

  try {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS n
         FROM global_job_pool
        WHERE status = 'active'
          AND title ILIKE $1`,
      [`%${terme}%`],
    );
    return Number(rows?.[0]?.n ?? 0);
  } catch (e) {
    console.warn("[lm/cv] comptage des offres indisponible :", e);
    return 0;
  }
}

/** Les trois premiers mots suffisent : au-delà, le ILIKE ne matche plus rien. */
function termeRecherche(metier: string): string | null {
  const terme = metier.trim().split(/\s+/).slice(0, 3).join(" ");
  return terme.length >= 3 ? terme : null;
}

// ── Point d'entrée ──────────────────────────────────────────────────────────

export async function analyserCv(texteCv: string): Promise<RapportCv> {
  const resultats = await Promise.all([
    ...AGENTS_AXES.map((def) => lancerAxe(def, texteCv)),
    lancerMiroir(texteCv),
  ]);

  const axes = resultats.slice(0, AGENTS_AXES.length) as AxeAnalyse[];
  const miroir = resultats[AGENTS_AXES.length] as Miroir | null;

  const scoreGlobal = Math.round(axes.reduce((s, a) => s + a.score * a.poids, 0) / 100);

  const completude = axes.find((a) => a.cle === "completude") as any;
  const metier: string = completude?._metier ?? "";
  const anneesExperience: number | null = completude?._annees ?? null;

  const offresOuvertes = metier
    ? await avecDelai(compterOffres(metier), 0, "comptage des offres")
    : 0;

  // Les champs de travail ne partent pas au client.
  axes.forEach((a) => {
    delete (a as any)._metier;
    delete (a as any)._annees;
  });

  return {
    scoreGlobal,
    metier,
    anneesExperience,
    miroir,
    axes,
    planAction: construirePlan(axes),
    offresOuvertes,
  };
}
