import { useState, useRef, useCallback, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Upload, Loader2, AlertTriangle, CheckCircle2, ArrowRight, FileCheck2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";
import LogoRebond from "@/components/LogoRebond";
import { demande } from "@/lib/lmCv";

/**
 * Cet écran ne montre jamais de vrai rapport : il collecte, puis renvoie vers
 * la page de chargement. Ce qui s'affiche à droite est une démonstration en
 * boucle, qui donne à voir la forme du résultat avant de déposer quoi que ce
 * soit. Le rapport réel vit sur `/lm/analyse-de-cv/resultat/:id`.
 */
type CleAxe = "completude" | "ats" | "qualite" | "structure";

const FORMATS = ".pdf,.doc,.docx,.txt";
const VERT = "#2D9326";

const AXES: { cle: CleAxe; libelle: string }[] = [
  { cle: "completude", libelle: "Complétude" },
  { cle: "ats", libelle: "ATS" },
  { cle: "qualite", libelle: "Qualité" },
  { cle: "structure", libelle: "Structure" },
];

const DEMO = {
  scoreGlobal: 68,
  axes: { completude: 74, ats: 55, qualite: 61, structure: 78 } as Record<CleAxe, number>,
  salaire: { bas: 45, haut: 58, nbOffres: 214 },
  actions: [
    "Remplacez « Participation au déploiement » par « Déployé l'outil sur 3 sites, 120 utilisateurs formés ».",
    "Chiffrez vos 3 derniers postes : budget, taille d'équipe, résultat obtenu.",
    "Retirez les étoiles de compétences ★★★ : les logiciels de tri ne savent pas les lire.",
    "Deux pages maximum : les missions d'avant 2018 tiennent en deux lignes chacune.",
    "Expliquez le trou de 12 mois entre vos deux derniers postes.",
  ],
};

function prefereMoinsAnimer() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/** Valeur qui monte jusqu'à sa cible. `actif` permet de rejouer l'animation. */
function useValeurAnimee(cible: number, actif = true, duree = 1200) {
  const [valeur, setValeur] = useState(prefereMoinsAnimer() || !actif ? cible : 0);

  useEffect(() => {
    if (prefereMoinsAnimer()) {
      setValeur(cible);
      return;
    }
    let frame = 0;
    const depart = performance.now();
    const tick = (t: number) => {
      const avancement = Math.min(1, (t - depart) / duree);
      setValeur(cible * (1 - Math.pow(1 - avancement, 3)));
      if (avancement < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [cible, duree, actif]);

  return valeur;
}

/** Révèle `total` éléments un par un — la cascade du rapport. */
function useCascade(total: number, pas = 160, depart = 400) {
  const [reveles, setReveles] = useState(prefereMoinsAnimer() ? total : 0);

  useEffect(() => {
    if (prefereMoinsAnimer()) {
      setReveles(total);
      return;
    }
    setReveles(0);
    const minuteurs = Array.from({ length: total }, (_, i) =>
      setTimeout(() => setReveles((n) => Math.max(n, i + 1)), depart + i * pas),
    );
    return () => minuteurs.forEach(clearTimeout);
  }, [total, pas, depart]);

  return reveles;
}

function classeApparition(visible: boolean) {
  return `transition-all duration-500 ease-out ${
    visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
  }`;
}

function Jauge({ score, taille = 130 }: { score: number; taille?: number }) {
  const anime = useValeurAnimee(score);
  const r = taille * 0.46 - 5;
  const circonference = 2 * Math.PI * r;
  const c = taille / 2;

  return (
    <div className="relative shrink-0" style={{ width: taille, height: taille }}>
      <svg viewBox={`0 0 ${taille} ${taille}`} className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx={c} cy={c} r={r} fill="none" stroke="currentColor" className="text-primary/15" strokeWidth="10" />
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={VERT}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circonference}
          strokeDashoffset={circonference - (anime / 100) * circonference}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span
          className="font-bold tabular-nums text-primary"
          style={{ fontSize: taille * 0.27, lineHeight: 1 }}
        >
          {Math.round(anime)}
        </span>
        <span className="mt-1 font-semibold text-primary/60" style={{ fontSize: taille * 0.1 }}>
          / 100
        </span>
      </div>
    </div>
  );
}

function Radar({ valeurs, taille = 190 }: { valeurs: Record<CleAxe, number>; taille?: number }) {
  const avancement = useValeurAnimee(100, true, 1400) / 100;
  const c = taille / 2;
  const rayon = taille * 0.3;
  const marge = taille * 0.22;

  const point = (i: number, ratio: number) => {
    const a = (Math.PI * 2 * i) / AXES.length - Math.PI / 2;
    return [c + Math.cos(a) * rayon * ratio, c + Math.sin(a) * rayon * ratio];
  };

  return (
    <svg
      viewBox={`${-marge} ${-marge * 0.45} ${taille + marge * 2} ${taille + marge * 0.9}`}
      className="h-auto w-full"
      role="img"
      aria-label="Profil du CV sur cinq critères"
    >
      {[0.33, 0.66, 1].map((n) => (
        <polygon
          key={n}
          points={AXES.map((_, i) => point(i, n).join(",")).join(" ")}
          fill="none"
          stroke="currentColor"
          className="text-border"
          strokeWidth="1"
        />
      ))}
      {AXES.map((_, i) => {
        const [x, y] = point(i, 1);
        return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="currentColor" className="text-border" strokeWidth="1" />;
      })}
      <polygon
        points={AXES.map(({ cle }, i) => point(i, (valeurs[cle] / 100) * avancement).join(",")).join(" ")}
        fill={VERT}
        fillOpacity="0.2"
        stroke={VERT}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {AXES.map(({ cle }, i) => {
        const [x, y] = point(i, (valeurs[cle] / 100) * avancement);
        return <circle key={cle} cx={x} cy={y} r="3" fill={VERT} />;
      })}
      {AXES.map(({ cle, libelle }, i) => {
        const [x, y] = point(i, 1.32);
        return (
          <text
            key={cle}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-muted-foreground"
            style={{ fontSize: taille * 0.062 }}
          >
            {libelle}
          </text>
        );
      })}
    </svg>
  );
}

/** Bloc sombre « fourchette de salaire ». */
function BlocSalaire({
  salaire,
  visible,
}: {
  salaire: { bas: number; haut: number; nbOffres: number };
  visible: boolean;
}) {
  return (
    <div className={`rounded-xl bg-foreground p-3 ${classeApparition(visible)}`}>
      <p className="mb-0.5 text-[10px] uppercase tracking-wide text-background/50">
        Fourchette de salaire
      </p>
      <p className="text-2xl font-bold tabular-nums text-primary">
        {salaire.bas}
        <span className="mx-1 text-base text-background/50">à</span>
        {salaire.haut}
        <span className="ml-0.5 text-lg text-background/70">k€</span>
      </p>
      <p className="text-[10px] text-background/50">
        brut annuel · sur {salaire.nbOffres} offres collectées
      </p>
    </div>
  );
}

export default function LmAnalyseCv() {
  const [fichier, setFichier] = useState<File | null>(null);
  const [email, setEmail] = useState("");
  const [consentCv, setConsentCv] = useState(false);
  const [consentInfos, setConsentInfos] = useState(false);
  const [etat, setEtat] = useState<"formulaire" | "analyse" | "rapport">("formulaire");
  const [erreur, setErreur] = useState<string | null>(null);
  const [survole, setSurvole] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, naviguer] = useLocation();

  const emailValide = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const pret = !!fichier && emailValide;

  // Cet écran ne fait que collecter. L'appel d'analyse part de la page de
  // chargement, pour que l'attente soit occupée par l'animation plutôt que
  // par un bouton figé.
  const lancer = useCallback(async () => {
    if (!fichier || !emailValide) return;
    setErreur(null);
    setEtat("analyse");
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
        reader.onerror = () => reject(new Error("lecture impossible"));
        reader.readAsDataURL(fichier);
      });

      const pose = demande.poser({
        fileData: base64,
        fileName: fichier.name,
        mimeType: fichier.type,
        email: email.trim(),
        consentCv,
        consentInfos,
      });

      if (!pose) {
        setErreur(
          "Votre navigateur bloque le stockage de session. Désactivez la navigation privée pour lancer l'analyse.",
        );
        setEtat("formulaire");
        return;
      }

      naviguer("/lm/analyse-de-cv/chargement");
    } catch {
      setErreur("Ce fichier n'a pas pu être lu. Réessayez avec un PDF ou un Word.");
      setEtat("formulaire");
    }
  }, [fichier, email, emailValide, consentCv, consentInfos, naviguer]);

  const valeursAxes: Record<CleAxe, number> = DEMO.axes;
  const salaire = DEMO.salaire;
  const puces = DEMO.actions;

  // Cascade : label du score, salaire, titre du plan, puis chaque puce.
  const reveles = useCascade(3 + puces.length);

  return (
    <div className="min-h-screen bg-gradient-to-b from-card to-background text-foreground">
      <SEO
        title="Ce que votre CV vaut — analyse gratuite | Rebond"
        description="Score sur 5 critères, fourchette de salaire, incohérences et plan d'action. 90 secondes, gratuit, sans inscription."
      />

      <header className="mx-auto flex max-w-[1400px] items-center justify-between px-5 pt-5">
        <Link href="/">
          <span className="block cursor-pointer leading-none">
            <LogoRebond height={32} />
          </span>
        </Link>
        <Link href="/signin">
          <span className="cursor-pointer text-sm text-muted-foreground hover:text-primary">
            J'ai déjà un compte
          </span>
        </Link>
      </header>

      <main className="mx-auto max-w-[1400px] px-5 pb-16 pt-8">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-bold leading-tight text-balance md:text-4xl">
            Ce que votre CV vaut
            <br />
            <span className="text-primary">avant qu'un recruteur l'ouvre.</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground md:text-base">
            Score sur 5 critères, fourchette de salaire, axes à corriger.{" "}
            <span className="font-bold text-primary">90 secondes, gratuit.</span>
          </p>
        </div>

        <div className="grid items-stretch gap-6 md:grid-cols-2">
          {/* ── Colonne gauche : le formulaire ── */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              lancer();
            }}
            className="flex h-full flex-col gap-5 rounded-2xl bg-foreground p-4 text-background md:p-8"
          >
            <h2 className="text-lg font-bold text-primary md:text-xl">Faites analyser votre CV</h2>

            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-background/80">Votre CV</p>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setSurvole(true);
                }}
                onDragLeave={() => setSurvole(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setSurvole(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) setFichier(f);
                }}
                onClick={() => inputRef.current?.click()}
                className={`cursor-pointer rounded-xl border-2 border-dashed px-4 py-10 text-center transition-all md:py-14 ${
                  survole ? "border-primary bg-primary/10" : "border-background/20 hover:border-background/40"
                }`}
                data-testid="lm-cv-zone-depot"
              >
                {fichier ? (
                  <div className="flex flex-col items-center gap-1.5">
                    <FileCheck2 className="mx-auto h-8 w-8 text-primary" />
                    <p className="text-base font-semibold md:text-lg">{fichier.name}</p>
                    <p className="text-xs text-background/50 md:text-sm">Cliquez pour en choisir un autre</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5">
                    <Upload className="mx-auto h-8 w-8 text-background/40" />
                    <p className="text-base font-semibold md:text-lg">Glissez votre CV ici</p>
                    <p className="text-xs text-background/50 md:text-sm">
                      ou cliquez pour parcourir · PDF ou Word, 10 Mo max
                    </p>
                  </div>
                )}
                <input
                  ref={inputRef}
                  type="file"
                  accept={FORMATS}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setFichier(f);
                  }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="lm-email" className="text-sm font-medium text-background/80">
                Votre e-mail
              </label>
              <input
                id="lm-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="prenom@exemple.com"
                className="w-full rounded-lg border border-background/20 bg-background/10 px-3 py-2.5 text-base text-background placeholder:text-background/40 focus:border-primary focus:outline-none"
                data-testid="lm-cv-email"
              />
            </div>

            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                checked={consentCv}
                onChange={(e) => setConsentCv(e.target.checked)}
                className="mt-0.5 accent-primary"
                data-testid="lm-cv-consent-cv"
              />
              <span className="text-xs leading-tight text-background/60">
                J'accepte que Rebond conserve mon CV pour me proposer des offres qui correspondent à
                mon profil.{" "}
                <Link href="/confidentialite">
                  <span className="cursor-pointer text-primary underline">RGPD</span>
                </Link>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                checked={consentInfos}
                onChange={(e) => setConsentInfos(e.target.checked)}
                className="mt-0.5 accent-primary"
                data-testid="lm-cv-consent-infos"
              />
              <span className="text-xs leading-tight text-background/50">
                OK pour un e-mail par mois : conseils CV, salaires et coulisses du recrutement.
              </span>
            </label>

            {erreur && (
              <div
                className="flex items-start gap-2 rounded-lg bg-destructive/20 p-3 text-xs"
                role="alert"
                data-testid="lm-cv-erreur"
              >
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                <span>{erreur}</span>
              </div>
            )}

            <div className="flex flex-1 items-end">
              <Button
                type="submit"
                disabled={!pret || etat === "analyse"}
                className="w-full rounded-xl py-3 text-sm font-semibold md:py-6 md:text-base"
                data-testid="lm-cv-lancer"
              >
                {etat === "analyse" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyse en cours…
                  </>
                ) : (
                  "Lancer mon analyse"
                )}
              </Button>
            </div>
          </form>

          {/* ── Colonne droite : le rapport ── */}
          <div
            className="flex h-full flex-col rounded-2xl border border-card-border bg-card p-4 shadow-sm md:p-6"
            data-testid="lm-cv-apercu"
          >
            <h2 className="mb-3 text-base font-bold md:text-lg">Aperçu de votre rapport</h2>

            {/* Score + radar */}
            <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex flex-shrink-0 flex-col items-center gap-1.5">
                <Jauge score={DEMO.scoreGlobal} />
                <p
                  className={`text-xs font-semibold text-primary ${classeApparition(reveles >= 1)}`}
                >
                  Score global de votre CV
                </p>
              </div>
              <div className="hidden min-w-0 flex-1 justify-center md:flex">
                {/* Le SVG est en w-full : sans plafond il s'étire à toute la
                    colonne et écrase la jauge, qui elle est fixe à 130 px. */}
                <div className="w-full max-w-[200px]">
                  <Radar valeurs={valeursAxes} />
                </div>
              </div>
            </div>

            {salaire ? (
              <BlocSalaire salaire={salaire} visible={reveles >= 2} />
            ) : (
              <div className={`rounded-xl bg-muted p-3 text-xs text-muted-foreground ${classeApparition(reveles >= 2)}`}>
                Pas assez d'offres collectées sur ce métier pour donner une fourchette fiable.
              </div>
            )}

            {/* Plan d'action */}
            <div className="mt-3">
              <p className={`mb-2 text-xs font-semibold ${classeApparition(reveles >= 3)}`}>
                Plan d'action
              </p>
              <ul className="flex flex-col gap-1">
                {puces.map((texte, i) => (
                  <li
                    key={texte}
                    className={`flex items-start gap-1.5 text-[11px] text-muted-foreground ${classeApparition(
                      reveles >= 4 + i,
                    )}`}
                    data-testid={`lm-cv-action-${i + 1}`}
                  >
                    <span className="mt-0.5 flex-shrink-0 text-primary">•</span>
                    <span>{texte}</span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="mt-auto pt-4 text-center text-[11px] text-muted-foreground">
              Exemple. Vos résultats remplacent ceux-ci dès l'analyse terminée.
            </p>
          </div>
        </div>

        <div className="pb-8 pt-10 text-center">
          <p className="text-sm font-medium md:text-lg">
            <span className="font-bold text-primary">Des milliers de candidats</span> ont déjà rebondi
            avec nous
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Rebond — la plateforme qui accompagne votre recherche d'emploi de bout en bout.
          </p>
        </div>
      </main>
    </div>
  );
}
