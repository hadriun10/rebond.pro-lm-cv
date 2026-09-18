import { SOCLE_COMMUN, formatSortieAxe } from "./base";

/**
 * Axe 1 — Complétude (25 %).
 *
 * La question posée : tout ce qu'un recruteur doit trouver y est-il, sans trou ?
 * C'est l'agent qui lit la carrière en entier, donc c'est lui qui identifie
 * aussi le métier et l'ancienneté — les deux servent ensuite à chiffrer la
 * fourchette de salaire et le nombre d'offres ouvertes.
 */
export const MARQUEURS_COMPLETUDE = [
  "experiences_completes",
  "trous_expliques",
  "contact_exhaustif",
  "formation_calibree",
  "langues_et_competences_prouvees",
] as const;

export const PROMPT_COMPLETUDE = `${SOCLE_COMMUN}

AXE ANALYSÉ : COMPLÉTUDE
Tout ce qu'un recruteur doit trouver y est-il, sans trou ?

MARQUEURS À NOTER

1. experiences_completes — Les expériences sont-elles toutes là, et complètes ?
   Chaque poste porte une date de début ET de fin, un intitulé précis, une entreprise, un lieu.
   L'ordre est antéchronologique (le plus récent en premier).
   0 : des postes sans dates, ou un parcours manifestement amputé.
   3 : chaque ligne est datée, nommée, situable, et l'ordre est respecté.

2. trous_expliques — Les interruptions sont-elles assumées ?
   Repérez tout écart de plus de 3 mois entre la fin d'un poste et le début du suivant.
   Un trou assumé porte un motif lisible : formation, freelance, projet, congé, voyage, recherche.
   Un trou masqué par des dates à l'année seule ("2019 - 2021" sans mois) compte comme non expliqué.
   Citez les dates exactes du ou des trous que vous trouvez.
   0 : plusieurs trous non expliqués, ou des dates volontairement floues.
   3 : aucune interruption, ou chacune porte son motif.

3. contact_exhaustif — Peut-on vous joindre, et savoir où vous êtes ?
   Attendu : nom, prénom, ville et pays, téléphone, e-mail, profil LinkedIn.
   0 : e-mail ou téléphone manquant.
   3 : les six éléments sont présents et lisibles.

4. formation_calibree — La formation est-elle utile, et proportionnée ?
   Attendu par ligne : intitulé du diplôme, établissement, année, mention si obtenue.
   Au-delà de 10 ans d'expérience, une à deux lignes suffisent : le baccalauréat et les diplômes intermédiaires n'ont plus rien à y faire.
   0 : formation absente, ou empilement de diplômes scolaires sur un profil expérimenté.
   3 : lignes complètes, nombre proportionné à l'ancienneté.

5. langues_et_competences_prouvees — Les niveaux sont-ils prouvés ou proclamés ?
   Une langue se prouve : niveau CECRL (A2 à C2) ou certification chiffrée (TOEIC, TOEFL, IELTS), PLUS une trace d'usage réel dans une expérience (équipe internationale, documentation rédigée, séjour, réunions animées).
   « Anglais courant » seul ne vaut rien. Les étoiles, jauges et barres de niveau ne valent rien non plus.
   Même exigence pour les compétences : celles qui comptent réapparaissent dans au moins une expérience.
   0 : étoiles, jauges, ou mentions vagues sans aucune preuve.
   3 : niveaux normés et instanciés dans le parcours.

IDENTIFICATION DU PROFIL
Vous lisez la carrière entière, donc vous renseignez aussi :
- metierDetecte : l'intitulé de métier que ce CV vise, tel qu'on le chercherait sur un site d'offres. Deux à quatre mots, sans mention de niveau ("Chef de projet digital", pas "Chef de projet digital senior"). Si le CV ne permet pas de trancher, mettez "".
- anneesExperience : le nombre d'années d'expérience professionnelle cumulées, arrondi. null si indéterminable.

${formatSortieAxe(MARQUEURS_COMPLETUDE, [
  `"metierDetecte": "<intitulé du métier visé, 2 à 4 mots>"`,
  `"anneesExperience": <nombre d'années cumulées, ou null>`,
])}

CV À ANALYSER :
`;
