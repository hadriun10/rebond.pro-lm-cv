import { Link } from "wouter";
import { ArrowRight, Briefcase, FileEdit, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

const VERT = "#2D9326";

/**
 * Les appels à l'action du rapport déverrouillé.
 *
 * Une fois le rapport ouvert, la personne sait quoi corriger — c'est le moment
 * exact où elle se demande « et après ? ». Les trois blocs ci-dessous répondent
 * à cette question, du plus léger au plus engageant : voir les offres, puis
 * corriger son CV, puis suivre ses candidatures.
 *
 * `/emploi` est le job board public : on peut y envoyer quelqu'un sans compte,
 * ce qui évite de redemander un engagement à quelqu'un qui vient d'en donner un.
 */

function lienOffres(metier: string) {
  return metier ? `/emploi?q=${encodeURIComponent(metier)}` : "/emploi";
}

/**
 * Carte compacte, colonne de droite.
 *
 * Le bouton blanc porte l'action, la carte ne fait que l'annoncer. Un pavé
 * entièrement cliquable sans bouton visible ne se lit pas comme un bouton : on
 * sait qu'il y a quelque chose à faire, on ne sait pas quoi ni où cliquer.
 */
export function CarteOffres({ nb, metier }: { nb: number; metier: string }) {
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: VERT }} data-testid="lm-cv-cta-carte-offres">
      <p className="text-base font-bold leading-snug text-white">Votre prochain poste est sûrement là.</p>
      <p className="mt-1.5 text-sm leading-snug text-white/85">
        {nb > 0 ? `${nb} offres` : "Des offres"}
        {metier ? ` de ${metier.toLowerCase()}` : ""} sont ouvertes en ce moment.
      </p>
      <Link href={lienOffres(metier)}>
        <span className="mt-4 flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-3 text-sm font-bold text-primary hover-elevate">
          Découvrir nos offres d'emploi
          <ArrowRight className="h-4 w-4" />
        </span>
      </Link>
    </div>
  );
}

/**
 * Bandeau large, posé dans le fil de lecture.
 *
 * Deux variantes, parce que le bandeau apparaît deux fois dans la page. Un même
 * texte répété se lit comme un bug d'affichage ; deux formulations disent à
 * chaque fois où on en est dans la lecture, pour une seule et même destination.
 */
export function BandeauOffres({
  nb,
  metier,
  variante = "milieu",
}: {
  nb: number;
  metier: string;
  variante?: "milieu" | "avant-plan";
}) {
  const nomMetier = metier ? metier.toLowerCase() : "votre métier";

  const textes =
    variante === "milieu"
      ? {
          accroche: "Pendant que vous corrigez",
          titre:
            nb > 0
              ? `${nb} postes de ${nomMetier} sont ouverts aujourd'hui.`
              : `Les postes de ${nomMetier} ouverts aujourd'hui.`,
        }
      : {
          accroche: "Et une fois corrigé",
          titre:
            nb > 0
              ? `Ce CV, remis d'aplomb, part sur ${nb} offres de ${nomMetier}.`
              : `Ce CV, remis d'aplomb, part sur les offres de ${nomMetier}.`,
        };

  return (
    <div
      className="rounded-2xl p-5 text-white md:p-6"
      style={{ backgroundColor: VERT }}
      data-testid={`lm-cv-cta-bandeau-offres-${variante}`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex-1">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-white/70">
            {textes.accroche}
          </p>
          <p className="text-base font-semibold leading-snug md:text-lg">{textes.titre}</p>
        </div>
        <Link href={lienOffres(metier)}>
          <span className="flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-white px-6 py-3 text-center text-sm font-bold text-primary hover-elevate">
            Découvrir nos offres d'emploi
            <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      </div>
    </div>
  );
}

/** Bloc de fin de rapport : ce que le compte ajoute, en trois temps. */
export function BlocSuite({ metier }: { metier: string }) {
  const etapes = [
    {
      icone: FileEdit,
      titre: "Corrigez votre CV",
      texte: "Rebond IA réécrit vos expériences ligne à ligne, avec les chiffres qui manquent.",
    },
    {
      icone: Briefcase,
      titre: "Ciblez les bonnes offres",
      texte: "Votre score face à une offre précise, et les mots-clés à ajouter pour passer le tri.",
    },
    {
      icone: Send,
      titre: "Suivez vos candidatures",
      texte: "Relances, entretiens, contacts : tout au même endroit, plus de tableur.",
    },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card p-5 md:p-6" data-testid="lm-cv-cta-suite">
      <h3 className="text-base font-bold text-balance md:text-lg">
        Vous savez quoi corriger. Rebond le fait avec vous.
      </h3>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {etapes.map(({ icone: Icone, titre, texte }) => (
          <div key={titre}>
            <Icone className="h-5 w-5 text-primary" />
            <p className="mt-2 text-sm font-semibold">{titre}</p>
            <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{texte}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
        <Link href="/signup?from=lm-analyse-cv" className="flex-1">
          <Button className="h-11 w-full">
            Créer mon compte gratuit
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </Link>
        <Link href={lienOffres(metier)} className="flex-1">
          <Button variant="outline" className="h-11 w-full">
            Découvrir nos offres d'emploi
          </Button>
        </Link>
      </div>
    </div>
  );
}
