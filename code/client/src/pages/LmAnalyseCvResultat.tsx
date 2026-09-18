import { useState, useEffect, Fragment } from "react";
import { Link, useRoute } from "wouter";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";
import LogoRebond from "@/components/LogoRebond";
import LmInscriptionDialog from "@/components/LmInscriptionDialog";
import { CarteOffres, BandeauOffres, BlocSuite } from "@/components/LmCtaOffres";
import {
  rapport as stockRapport,
  partagerMarqueurs,
  type Axe,
  type Marqueur,
  type Rapport,
} from "@/lib/lmCv";

const VERT = "#2D9326";
const NOTE_MAX = 3;

/**
 * Mode aperçu : « Déverrouiller » ouvre le rapport sur place, sans compte.
 *
 * Il sert à juger la maquette du rapport ouvert et de ses appels à l'action
 * sans avoir à créer un compte à chaque essai. Actif en développement, ou sur
 * `?apercu=1`. En production, le bouton ouvre la popup d'inscription : c'est la
 * contrepartie annoncée à la personne et elle doit être tenue.
 */
function modeApercu(): boolean {
  if (typeof window === "undefined") return false;
  if (new URLSearchParams(window.location.search).has("apercu")) return true;
  return Boolean(import.meta.env?.DEV);
}

/** Un chiffre de démonstration quand la base ne répond pas, pour juger le CTA. */
const OFFRES_DEMO = 128;

function prefereMoinsAnimer() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/** Le compteur qui monte : c'est lui qui fait regarder le score. */
function useValeurAnimee(cible: number, duree = 2400) {
  const [valeur, setValeur] = useState(prefereMoinsAnimer() ? cible : 0);
  useEffect(() => {
    if (prefereMoinsAnimer()) {
      setValeur(cible);
      return;
    }
    let frame = 0;
    const depart = performance.now();
    const tick = (t: number) => {
      const a = Math.min(1, (t - depart) / duree);
      setValeur(cible * (1 - Math.pow(1 - a, 3)));
      if (a < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [cible, duree]);
  return valeur;
}

/** Vert au-dessus de 67, ambre entre 34 et 66, rouge en dessous. */
function couleur(score: number) {
  if (score >= 67) return { barre: VERT, texte: "text-primary", pastille: "bg-primary text-primary-foreground" };
  if (score >= 34)
    return { barre: "#D89614", texte: "text-amber-600 dark:text-amber-500", pastille: "bg-amber-500 text-white" };
  return { barre: "#C4342B", texte: "text-destructive", pastille: "bg-destructive text-destructive-foreground" };
}

function AnneauScore({ score, taille = 150 }: { score: number; taille?: number }) {
  const anime = useValeurAnimee(score);
  const epaisseur = 12;
  const r = (taille - epaisseur) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: taille, height: taille }}>
      <svg viewBox={`0 0 ${taille} ${taille}`} className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx={taille / 2} cy={taille / 2} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={epaisseur} />
        <circle
          cx={taille / 2}
          cy={taille / 2}
          r={r}
          fill="none"
          stroke={VERT}
          strokeWidth={epaisseur}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ - (anime / 100) * circ}
        />
      </svg>
      <span className="absolute flex items-baseline font-bold text-primary">
        <span className="text-5xl tabular-nums">{Math.round(anime)}</span>
        <span className="ml-0.5 text-lg opacity-70">/100</span>
      </span>
    </div>
  );
}

function Radar({ axes, taille = 200 }: { axes: Axe[]; taille?: number }) {
  const c = taille / 2;
  const rayon = taille * 0.3;
  const marge = taille * 0.24;
  const point = (i: number, ratio: number) => {
    const a = (Math.PI * 2 * i) / axes.length - Math.PI / 2;
    return [c + Math.cos(a) * rayon * ratio, c + Math.sin(a) * rayon * ratio];
  };
  return (
    <svg
      viewBox={`${-marge} ${-marge * 0.5} ${taille + marge * 2} ${taille + marge}`}
      className="h-auto w-full"
      role="img"
      aria-label="Profil du CV sur les quatre axes"
    >
      {[0.33, 0.66, 1].map((n) => (
        <polygon
          key={n}
          points={axes.map((_, i) => point(i, n).join(",")).join(" ")}
          fill="none"
          stroke="currentColor"
          className="text-border"
          strokeWidth="1"
        />
      ))}
      {axes.map((_, i) => {
        const [x, y] = point(i, 1);
        return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="currentColor" className="text-border" strokeWidth="1" />;
      })}
      <polygon
        points={axes.map((a, i) => point(i, a.score / 100).join(",")).join(" ")}
        fill={VERT}
        fillOpacity="0.25"
        stroke={VERT}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {axes.map((a, i) => {
        const [x, y] = point(i, 1.3);
        return (
          <text
            key={a.cle}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-muted-foreground"
            style={{ fontSize: taille * 0.068 }}
          >
            {a.libelle}
          </text>
        );
      })}
    </svg>
  );
}

/** Le bouton posé par-dessus une zone floutée. */
function BoutonDeverrouiller({ onClick, libelle = "Déverrouiller" }: { onClick: () => void; libelle?: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-2">
      <button
        onClick={onClick}
        className="pointer-events-auto flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md hover-elevate"
      >
        <Lock className="h-4 w-4" />
        {libelle}
      </button>
    </div>
  );
}

function LigneMarqueur({ m, flou = false }: { m: Marqueur; flou?: boolean }) {
  const pct = m.note === null ? 0 : (m.note / NOTE_MAX) * 100;
  const c = couleur(pct);
  return (
    <div className={`flex items-center gap-3 border-b border-border py-2.5 last:border-b-0 ${flou ? "blur-sm select-none" : ""}`}>
      <div className="min-w-0 flex-1">
        <span className="text-sm font-medium">{m.libelle}</span>
        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{m.constat}</p>
      </div>
      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${c.pastille}`}>
        {m.note ?? "–"}/{NOTE_MAX}
      </span>
    </div>
  );
}

function BlocAxe({
  axe,
  deverrouille,
  onDeverrouiller,
}: {
  axe: Axe;
  deverrouille: boolean;
  onDeverrouiller: () => void;
}) {
  const partage = partagerMarqueurs(axe.marqueurs);
  const visibles = deverrouille ? axe.marqueurs : partage.visibles;
  const caches = deverrouille ? [] : partage.caches;
  const c = couleur(axe.score);

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4 md:p-5" data-testid={`lm-cv-axe-${axe.cle}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold md:text-base">{axe.libelle}</h3>
          <p className="mt-0.5 text-xs italic text-muted-foreground">{axe.question}</p>
        </div>
        <div className={`shrink-0 text-center ${c.texte}`}>
          <span className="block text-xl font-bold leading-none md:text-2xl">{axe.score}%</span>
          <span className="mt-0.5 block text-[10px] font-medium leading-none md:text-xs">{axe.score}/100 pts</span>
        </div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${axe.score}%`, backgroundColor: c.barre }}
        />
      </div>

      {axe.verdict && (
        <div className="rounded-xl bg-foreground/5 p-2.5 md:p-3">
          <p className="text-xs font-semibold leading-snug md:text-sm">{axe.verdict}</p>
        </div>
      )}

      {visibles.length > 0 && (
        <div>
          {visibles.map((m) => (
            <LigneMarqueur key={m.cle} m={m} />
          ))}
        </div>
      )}

      {caches.length > 0 && (
        <div className="relative">
          <div>
            {caches.map((m) => (
              <LigneMarqueur key={m.cle} m={m} flou />
            ))}
          </div>
          <BoutonDeverrouiller onClick={onDeverrouiller} />
        </div>
      )}
    </div>
  );
}

export default function LmAnalyseCvResultat() {
  const [, params] = useRoute("/lm/analyse-de-cv/resultat/:id");
  const id = params?.id ?? "";
  const [rapport, setRapport] = useState<Rapport | null>(null);
  const [introuvable, setIntrouvable] = useState(false);
  const [dialog, setDialog] = useState<"ferme" | "inscription" | "connexion">("ferme");
  const [deverrouille, setDeverrouille] = useState(false);
  const apercu = modeApercu();

  useEffect(() => {
    const r = id ? stockRapport.lire(id) : null;
    if (r) setRapport(r);
    else setIntrouvable(true);
  }, [id]);

  if (introuvable) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-5 text-center">
        <div className="max-w-md space-y-3">
          <p className="text-xl font-bold text-balance">Ce rapport n'est plus disponible.</p>
          <p className="text-sm text-muted-foreground">
            Les analyses ne sont pas conservées : il suffit de redéposer votre CV.
          </p>
          <Link href="/lm/analyse-de-cv">
            <Button className="mt-2">Analyser mon CV</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!rapport) return <div className="min-h-screen bg-background" />;

  const ouvrir = () => (apercu ? setDeverrouille(true) : setDialog("inscription"));
  const [premiere, ...suite] = rapport.planAction;
  const nom = [rapport.cvParse?.firstName, rapport.cvParse?.lastName].filter(Boolean).join(" ");

  // Sans base de données locale, le comptage renvoie 0 et les CTA disparaissent.
  // En aperçu on affiche un chiffre de démonstration, signalé par le bandeau.
  const nbOffres = rapport.offresOuvertes || (apercu ? OFFRES_DEMO : 0);
  const offresSimulees = apercu && rapport.offresOuvertes === 0 && nbOffres > 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title="Votre analyse de CV | Rebond"
        description="Votre score sur les quatre axes Rebond, ce qu'un recruteur perçoit, et votre plan d'action."
      />

      {apercu && (
        <div className="bg-amber-500/15 px-4 py-2 text-center text-xs text-amber-700 dark:text-amber-400">
          <strong>Mode aperçu</strong> — « Déverrouiller » ouvre le rapport sans compte, pour juger la maquette.
          {offresSimulees && ` Le nombre d'offres (${OFFRES_DEMO}) est un chiffre de démonstration : la base ne répond pas en local.`}
          {" "}En production, ces boutons ouvrent la popup d'inscription.
        </div>
      )}

      <header className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-4">
        <Link href="/">
          <span className="block cursor-pointer leading-none">
            <LogoRebond height={30} />
          </span>
        </Link>
        <button onClick={() => setDialog("connexion")} className="text-sm text-muted-foreground hover:text-primary">
          J'ai déjà un compte
        </button>
      </header>

      <main className="mx-auto max-w-[1200px] px-4 pb-12" data-testid="lm-cv-resultat">
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          {/* ── Colonne principale ── */}
          <div className="space-y-4">
            {/* Bandeau nom */}
            <div className="rounded-2xl bg-foreground p-4 text-background md:p-5">
              <h1 className="truncate text-lg font-bold md:text-2xl">{nom || "Votre profil"}</h1>
              {rapport.metier && (
                <p className="mt-0.5 text-sm text-background/60">
                  {rapport.metier}
                  {rapport.anneesExperience !== null && ` · ${rapport.anneesExperience} ans d'expérience`}
                </p>
              )}
            </div>

            {/* Effet miroir — jamais flouté */}
            {rapport.miroir && (
              <div className="rounded-2xl bg-foreground p-4 text-background md:p-5" data-testid="lm-cv-miroir">
                <p className="mb-2 text-xs uppercase tracking-wide text-background/50">
                  Ce qu'un recruteur perçoit en 30 secondes
                </p>
                <p className="text-sm leading-relaxed md:text-base">{rapport.miroir.percu}</p>
                {rapport.miroir.ecrit && (
                  <p className="mt-3 text-xs text-primary">Passage en cause : « {rapport.miroir.ecrit} »</p>
                )}
              </div>
            )}

            {/*
              Le CTA offres est posé au milieu de la lecture, juste après ATS.
              C'est le moment où la personne a encaissé deux axes de problèmes :
              lui montrer que des postes sont ouverts la relance avant qu'elle
              ne décroche, sans attendre le bas de page.
            */}
            {rapport.axes.map((axe) => (
              <Fragment key={axe.cle}>
                <BlocAxe axe={axe} deverrouille={deverrouille} onDeverrouiller={ouvrir} />
                {axe.cle === "ats" && nbOffres > 0 && (
                  <BandeauOffres nb={nbOffres} metier={rapport.metier} variante="milieu" />
                )}
              </Fragment>
            ))}

            {nbOffres > 0 && (
              <BandeauOffres nb={nbOffres} metier={rapport.metier} variante="avant-plan" />
            )}

            {/* Plan d'action */}
            {rapport.planAction.length > 0 && (
              <div className="space-y-3 rounded-2xl border border-border bg-card p-4 md:p-5" data-testid="lm-cv-plan">
                <div>
                  <h3 className="text-sm font-bold md:text-base">Par quoi commencer</h3>
                  <p className="mt-0.5 text-xs italic text-muted-foreground">
                    Classé par ce que chaque correction vous rapporte.
                  </p>
                </div>

                {premiere && (
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5">
                    <p className="text-sm font-bold">1. {premiere.titre}</p>
                    <p className="mt-1 text-xs leading-snug text-muted-foreground">{premiere.constat}</p>
                    <p className="mt-2 text-sm font-medium leading-snug">{premiere.correctif}</p>
                  </div>
                )}

                {suite.length > 0 && (
                  <div className="relative">
                    <div className={`space-y-2.5 ${deverrouille ? "" : "blur-sm select-none"}`}>
                      {suite.map((a) => (
                        <div key={a.rang} className="rounded-xl border border-border p-3.5">
                          <p className="text-sm font-bold">
                            {a.rang}. {a.titre}
                          </p>
                          <p className="mt-1 text-xs leading-snug text-muted-foreground">{a.constat}</p>
                          <p className="mt-2 text-sm leading-snug">{a.correctif}</p>
                        </div>
                      ))}
                    </div>
                    {!deverrouille && <BoutonDeverrouiller onClick={ouvrir} />}
                  </div>
                )}
              </div>
            )}

            {/* ── Une fois ouvert : où aller maintenant ── */}
            {deverrouille && <BlocSuite metier={rapport.metier} />}
          </div>

          {/* ── Colonne de droite ── */}
          <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
            <div className="rounded-2xl bg-foreground p-5 text-center text-background">
              <p className="mb-2 text-xs font-medium text-background/70">Ce que vaut votre CV aujourd'hui</p>
              <AnneauScore score={rapport.scoreGlobal} />
            </div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-sm font-bold">Profil 360°</p>
              <div className="relative mt-1">
                <div className={deverrouille ? "" : "blur-sm"} aria-hidden={!deverrouille}>
                  <Radar axes={rapport.axes} />
                </div>
                {!deverrouille && <BoutonDeverrouiller onClick={ouvrir} />}
              </div>
            </div>

            {!deverrouille && (
              <Button className="h-12 w-full text-base" onClick={ouvrir} data-testid="lm-cv-tout-deverrouiller">
                Tout déverrouiller
              </Button>
            )}

            {nbOffres > 0 && <CarteOffres nb={nbOffres} metier={rapport.metier} />}
          </aside>
        </div>
      </main>

      <LmInscriptionDialog
        key={dialog}
        ouvert={dialog !== "ferme"}
        modeInitial={dialog === "connexion" ? "connexion" : "inscription"}
        onOpenChange={(v) => !v && setDialog("ferme")}
      />
    </div>
  );
}
