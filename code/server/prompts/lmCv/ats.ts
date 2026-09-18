import { SOCLE_COMMUN, formatSortieAxe } from "./base";

/**
 * Axe 2 — ATS (20 %).
 *
 * La question posée : le CV franchit-il le filtre machine ?
 *
 * Cet agent reçoit le texte BRUT extrait du fichier, pas une version
 * structurée : c'est la seule façon de voir ce qu'un logiciel de tri voit
 * vraiment. Un CV passé par un parseur a déjà perdu ses colonnes, ses tableaux
 * et son désordre — c'est-à-dire exactement ce qu'on cherche à mesurer ici.
 */
export const MARQUEURS_ATS = [
  "parsabilite",
  "intitules_standards",
  "dates_normalisees",
  "mots_cles_metier",
  "fichier_propre",
] as const;

export const PROMPT_ATS = `${SOCLE_COMMUN}

AXE ANALYSÉ : ATS (logiciels de tri automatique)
Le CV franchit-il le filtre machine ?

CE QUE VOUS LISEZ
Le texte ci-dessous est l'extraction brute du fichier, dans l'ordre où la machine l'a lue. Les désordres que vous y voyez — phrases coupées, colonnes entremêlées, lignes dans le désordre, blocs collés — sont exactement ce qu'un logiciel de tri verra. Servez-vous-en comme preuve.

MARQUEURS À NOTER

1. parsabilite — Le texte ressort-il dans le bon ordre ?
   Indices de mise en page qui casse : deux idées sans rapport collées sur la même ligne, une section qui s'interrompt puis reprend plus loin, des fragments entrelacés (signe de colonnes), des lignes de tableau aplaties.
   Citez le passage abîmé que vous repérez.
   0 : l'ordre de lecture est manifestement cassé, des blocs entiers sont entremêlés.
   3 : le texte se lit du début à la fin sans accroc, une idée par ligne.

2. intitules_standards — Les sections portent-elles des noms que la machine connaît ?
   Attendu : « Expérience professionnelle », « Formation », « Compétences », « Langues ».
   Les titres inventés ("Mon parcours", "Ce qui me fait vibrer", "Au boulot !") ne sont pas reconnus et la section entière peut être ignorée.
   0 : titres fantaisistes, ou aucun titre de section.
   3 : intitulés standards sur toutes les sections.

3. dates_normalisees — Les dates sont-elles toutes dans le même format ?
   Un seul format sur tout le document, et un format lisible : MM/AAAA ou « Mars 2021 ».
   Mélanger « 2019 », « 03/2020 » et « depuis septembre » casse le calcul d'ancienneté côté machine.
   0 : formats mélangés, ou lignes sans date.
   3 : format unique sur 100 % des lignes.

4. mots_cles_metier — Les mots que le recruteur cherche sont-ils écrits ?
   Les termes du métier visé doivent apparaître en toutes lettres dans les expériences, pas seulement dans une liste de compétences isolée.
   Tout acronyme doit être développé au moins une fois : un filtre qui cherche « gestion de la relation client » ne trouvera jamais « CRM » seul.
   Nommez les mots-clés attendus pour ce métier qui manquent.
   0 : le vocabulaire du métier est absent des expériences.
   3 : termes présents, instanciés, acronymes développés.

5. fichier_propre — Reste-t-il des éléments que la machine ne sait pas lire ?
   AVANT DE NOTER, faites cette vérification mécanique : parcourez le texte et cherchez toute répétition d'un même symbole (★ ☆ * ● ○ ▮ ▯ ■ □ ▪ • répété deux fois ou plus d'affilée), en particulier à côté d'un nom de logiciel ou de compétence. C'est une échelle de niveau graphique. Un logiciel de tri n'en lit rien : la compétence existe, son niveau disparaît. Si vous en trouvez une seule occurrence, ce marqueur ne peut pas dépasser 1, et votre constat cite la ligne exacte.
   À bannir également : emojis, icônes porteuses de sens (une enveloppe à la place du mot e-mail), texte enfermé dans une image, information vitale placée en en-tête ou pied de page.
   0 : plusieurs de ces éléments, ou une information de contact illisible.
   1 : au moins une échelle graphique de compétence.
   3 : texte pur, aucun symbole répété, rien d'enfermé ailleurs.

${formatSortieAxe(MARQUEURS_ATS)}

TEXTE BRUT EXTRAIT DU FICHIER :
`;
