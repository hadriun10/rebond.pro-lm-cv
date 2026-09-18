import { SOCLE_COMMUN, formatSortieAxe } from "./base";

/**
 * Axe 4 — Structure (20 %).
 *
 * La question posée : le CV tient-il les trente secondes pendant lesquelles un
 * recruteur décide de le lire ou de passer au suivant ?
 */
export const MARQUEURS_STRUCTURE = [
  "titre_poste_vise",
  "accroche_unique",
  "longueur_calibree",
  "hierarchie_lecture",
  "lignes_courtes",
] as const;

export const PROMPT_STRUCTURE = `${SOCLE_COMMUN}

AXE ANALYSÉ : STRUCTURE
Le CV tient-il les trente secondes pendant lesquelles un recruteur décide de le lire ou de passer au suivant ?

MARQUEURS À NOTER

1. titre_poste_vise — Sait-on en une seconde ce que vous cherchez ?
   Sous le nom doit figurer le poste VISÉ, pas le dernier occupé. C'est la différence entre un CV qui candidate et un CV qui raconte.
   À bannir : aucun titre, « À la recherche de nouveaux défis », « Cadre polyvalent », un titre interne incompréhensible hors de votre ancienne entreprise.
   Citez le titre exact que vous lisez, ou son absence.
   0 : pas de titre, ou une formule creuse.
   3 : un intitulé de poste clair, qui existe sur le marché.

2. accroche_unique — L'accroche pourrait-elle être collée sur un autre CV ?
   Une accroche utile répond à deux questions : pourquoi ce métier, et pourquoi maintenant. Elle tient en trois à cinq lignes.
   Testez-la : si elle reste vraie en changeant le nom en haut du CV, elle ne sert à rien.
   0 : pas d'accroche, ou un paragraphe de généralités.
   3 : quelques lignes qui n'appartiennent qu'à cette personne.

3. longueur_calibree — Le format est-il proportionné au parcours ?
   Une page en dessous de cinq ans d'expérience. Deux pages au-delà, jamais plus.
   Estimez la longueur d'après le volume de texte et dites ce qui déborde.
   0 : trois pages ou plus, ou une demi-page sur un parcours fourni.
   3 : format juste, rien à couper.

4. hierarchie_lecture — Ce qui vend est-il en haut ?
   Le premier tiers de la première page doit contenir : nom, titre visé, accroche, et le début de l'expérience la plus forte.
   Une formation vieille de quinze ans placée avant les expériences, ou une liste de logiciels en ouverture, gaspillent l'endroit le plus lu du document.
   0 : l'ordre enterre les expériences.
   3 : l'œil tombe d'abord sur ce qui vous vend.

5. lignes_courtes — Le document s'attrape-t-il en diagonale ?
   Attendu : deux lignes maximum par puce, six puces maximum par expérience, un blanc net entre les blocs.
   À bannir : les paragraphes compacts, et toute liste plate de qualités personnelles.
   0 : des blocs de texte dense qu'on ne peut pas survoler.
   3 : puces courtes, aérées, hiérarchisées.

${formatSortieAxe(MARQUEURS_STRUCTURE)}

CV À ANALYSER :
`;
