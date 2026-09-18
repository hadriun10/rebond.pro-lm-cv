import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";
import LogoRebond from "@/components/LogoRebond";
import { demande, rapport as stockRapport, nouvelId } from "@/lib/lmCv";

const VERT = "#2D9326";

/** Ce que fait l'analyse, dit dans l'ordre où elle le fait. */
const PHASES = [
  "Lecture de votre CV…",
  "Extraction de vos expériences…",
  "Vérification des rubriques attendues…",
  "Passage dans un logiciel de tri…",
  "Relecture de vos réalisations…",
  "Contrôle de la cohérence des dates…",
  "Comparaison aux offres du marché…",
  "Rédaction de votre plan d'action…",
];

/** Ce qu'on apprend en attendant — vrai, court, utile. */
const ASTUCES = [
  "Un recruteur passe une trentaine de secondes sur un CV avant de trancher.",
  "« Autonome, rigoureux » sans preuve derrière ne rapporte aucun point.",
  "Le titre de votre CV doit annoncer le poste visé, pas le dernier occupé.",
  "Une réalisation chiffrée vaut trois lignes de description de mission.",
  "Les logiciels de tri ne lisent ni les colonnes, ni les tableaux, ni les étoiles.",
  "Un trou dans le parcours s'assume en une ligne — le masquer attire l'œil.",
  "Deux pages maximum, même avec vingt ans de carrière.",
];

function prefereMoinsAnimer() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Anneau de progression.
 *
 * Le pourcentage est UN seul bloc de texte, chiffre et signe compris. Séparer
 * le « % » dans son propre span le faisait flotter à côté du nombre au lieu de
 * lui être collé — et le désalignement variait avec le nombre de chiffres.
 */
function Anneau({ pourcent }: { pourcent: number }) {
  const taille = 190;
  const epaisseur = 12;
  const r = (taille - epaisseur) / 2;
  const circonference = 2 * Math.PI * r;

  return (
    <div className="relative mx-auto" style={{ width: taille, height: taille }}>
      <svg viewBox={`0 0 ${taille} ${taille}`} className="h-full w-full -rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id="degradeAnneau" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7DC46F" />
            <stop offset="100%" stopColor={VERT} />
          </linearGradient>
        </defs>
        <circle cx={taille / 2} cy={taille / 2} r={r} fill="none" stroke="currentColor" className="text-primary/10" strokeWidth={epaisseur} />
        <circle
          cx={taille / 2}
          cy={taille / 2}
          r={r}
          fill="none"
          stroke="url(#degradeAnneau)"
          strokeWidth={epaisseur}
          strokeLinecap="round"
          strokeDasharray={circonference}
          strokeDashoffset={circonference - (pourcent / 100) * circonference}
          style={{ transition: "stroke-dashoffset 600ms ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-5xl font-bold tabular-nums text-primary">{Math.round(pourcent)}%</span>
      </div>
    </div>
  );
}

export default function LmAnalyseCvChargement() {
  const [, naviguer] = useLocation();
  const [pourcent, setPourcent] = useState(4);
  const [phase, setPhase] = useState(0);
  const [astuce, setAstuce] = useState(0);
  const [erreur, setErreur] = useState<string | null>(null);
  const lance = useRef(false);

  // L'analyse réelle. Lancée une seule fois, même en mode strict React.
  useEffect(() => {
    if (lance.current) return;
    lance.current = true;

    const d = demande.prendre();
    if (!d) {
      naviguer("/lm/analyse-de-cv", { replace: true });
      return;
    }

    let annule = false;

    (async () => {
      try {
        const reponse = await fetch("/api/lm/cv-analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileData: d.fileData,
            mimeType: d.mimeType,
            email: d.email,
            consentCv: d.consentCv,
            consentInfos: d.consentInfos,
          }),
        });
        const donnees = await reponse.json();
        if (annule) return;

        if (!reponse.ok) {
          setErreur(donnees.message ?? "L'analyse n'a pas abouti.");
          return;
        }

        const id = nouvelId();
        stockRapport.poser(id, donnees);
        setPourcent(100);
        // On laisse l'anneau finir sa course avant de basculer.
        setTimeout(() => !annule && naviguer(`/lm/analyse-de-cv/resultat/${id}`, { replace: true }), 700);
      } catch {
        if (!annule) setErreur("La connexion a été interrompue pendant l'analyse.");
      }
    })();

    return () => {
      annule = true;
    };
  }, [naviguer]);

  // Progression simulée : on ne connaît pas la durée réelle, donc on approche
  // 92 % sans jamais l'atteindre. Le vrai 100 % arrive avec la réponse.
  useEffect(() => {
    if (prefereMoinsAnimer() || erreur) return;
    const t = setInterval(() => {
      setPourcent((p) => (p >= 92 ? p : p + Math.max(0.6, (92 - p) * 0.055)));
    }, 500);
    return () => clearInterval(t);
  }, [erreur]);

  useEffect(() => {
    if (erreur) return;
    const p = setInterval(() => setPhase((i) => Math.min(i + 1, PHASES.length - 1)), 3200);
    const a = setInterval(() => setAstuce((i) => i + 1), 4600);
    return () => {
      clearInterval(p);
      clearInterval(a);
    };
  }, [erreur]);

  if (erreur) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-card to-background text-foreground">
        <SEO title="Analyse de CV | Rebond" description="Analyse de CV gratuite." />
        <div className="flex items-center justify-center px-5 py-20">
          <div className="max-w-md space-y-3 text-center">
            <p className="text-xl font-bold text-balance">L'analyse s'est arrêtée en chemin.</p>
            <p className="text-sm text-muted-foreground">{erreur}</p>
            <Link href="/lm/analyse-de-cv">
              <Button className="mt-2" data-testid="lm-cv-reessayer">
                Réessayer
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-card to-background text-foreground">
      <SEO title="Analyse en cours | Rebond" description="Votre CV est en cours d'analyse." />

      <header className="mx-auto flex max-w-[1400px] items-center justify-between px-5 pt-5">
        <Link href="/">
          <span className="block cursor-pointer leading-none">
            <LogoRebond height={32} />
          </span>
        </Link>
      </header>

      <div className="flex items-center justify-center px-5 py-12 md:py-20">
        <div className="w-full max-w-xl text-center" data-testid="lm-cv-chargement">
          <Anneau pourcent={pourcent} />

          <div className="mt-8 flex h-12 items-center justify-center">
            <p key={PHASES[phase]} className="animate-in fade-in slide-in-from-bottom-2 text-lg font-medium duration-500">
              {PHASES[phase]}
            </p>
          </div>

          <div className="mx-auto mt-8 rounded-2xl border border-card-border bg-card px-6 py-4 text-left">
            <div key={astuce} className="flex animate-in items-start gap-3 fade-in duration-500">
              <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <p className="text-sm leading-relaxed text-muted-foreground">
                {ASTUCES[astuce % ASTUCES.length]}
              </p>
            </div>
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            Ne fermez pas cette page, votre rapport arrive.
          </p>
        </div>
      </div>
    </div>
  );
}
