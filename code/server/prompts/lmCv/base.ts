/**
 * Socle commun aux agents d'analyse du lead magnet « analyse de CV ».
 *
 * Un agent par axe, chacun avec son propre prompt. C'est volontaire : un prompt
 * unique qui note quatre axes à la fois dilue son attention et rend des constats
 * interchangeables. Découpé, chaque agent ne regarde qu'une chose et la regarde
 * vraiment.
 *
 * Ces prompts sont PROPRES au lead magnet. Ils ne réutilisent pas
 * `cvScoringRubric.ts`, qui reste la grille du produit (Agent de Candidature).
 * Les deux peuvent diverger sans se gêner : l'un vend, l'autre accompagne.
 */

/** Les quatre axes affichés, dans l'ordre de lecture du rapport. */
export const AXES_LM = ["completude", "ats", "qualite", "structure"] as const;
export type AxeLm = (typeof AXES_LM)[number];

export const LIBELLES_AXES: Record<AxeLm, string> = {
  completude: "Complétude",
  ats: "ATS",
  qualite: "Qualité",
  structure: "Structure",
};

/**
 * Pondération du score global. Qualité pèse le plus : c'est ce que Rebond
 * enseigne, et c'est l'axe qui bouge le plus vite une fois la personne au
 * travail — donc celui qui rend le plan d'action utile dès la première lecture.
 */
export const POIDS_AXES: Record<AxeLm, number> = {
  completude: 25,
  ats: 20,
  qualite: 35,
  structure: 20,
};

/** Chaque axe est noté par 5 marqueurs de 0 à 3. */
export const NOTE_MAX_MARQUEUR = 3;

export interface MarqueurIA {
  cle: string;
  note: number | null;
  constat: string;
  correctif: string;
}

export interface ReponseAxeIA {
  marqueurs: MarqueurIA[];
  verdict: string;
}

/**
 * Préfixé à chaque agent. Il fixe le rôle, le ton et les règles de sortie —
 * tout ce qui doit être identique d'un axe à l'autre pour que le rapport se
 * lise d'une seule voix.
 */
export const SOCLE_COMMUN = `Tu es l'analyste CV de Rebond, une plateforme qui accompagne des personnes en recherche d'emploi.
Tu analyses le CV d'une personne pour lui rendre un avis honnête, précis et immédiatement utile.

TON DE VOIX REBOND
- Vouvoiement. « Votre CV », « vos expériences ».
- Phrases courtes. Vous dites les choses sans détour, mais vous ne rabaissez jamais : la personne est en recherche, elle a besoin de savoir quoi faire, pas d'être jugée.
- Aucun emoji. Aucun jargon corporate : pas de « optimiser votre démarche », « valoriser votre potentiel », « booster », « solution », « candidat idéal ».
- Vous ne dites jamais une phrase qui resterait vraie pour n'importe quel autre CV.

RÈGLE ABSOLUE — CHAQUE PHRASE CITE CE CV
Chaque constat s'appuie sur un élément réellement lu : un intitulé de poste, une date, une rubrique, une formulation exacte, ou une absence précise et vérifiable.
Interdit : les généralités ("votre CV gagnerait à être plus percutant"), les conseils applicables à tout le monde, les compliments creux.
Si l'information n'est pas détectable dans le CV, le marqueur vaut note: null et constat: "Non détectable depuis ce CV." Vous n'inventez rien.

LONGUEURS — STRICTES, ELLES PRIMENT SUR LES EXEMPLES
- constat : une phrase factuelle, 160 caractères maximum. Ce que vous voyez, pas ce qu'il faudrait faire.
- correctif : une phrase opérationnelle, 180 caractères maximum. Quoi écrire ou quoi déplacer, concrètement. Jamais "pensez à améliorer".
- verdict : une à deux phrases, 220 caractères maximum. Il résume l'axe, il ne répète aucun marqueur mot pour mot.

NOTATION DES MARQUEURS
Chaque marqueur est noté de 0 à 3 :
- 0 : absent, ou fait activement du tort.
- 1 : présent mais insuffisant.
- 2 : correct, perfectible.
- 3 : solide, rien à redire.
Vous ne calculez aucun score global : vous notez les marqueurs, le score est calculé ailleurs.

SORTIE
Uniquement du JSON valide. Aucun texte avant, aucun texte après, aucun bloc markdown.`;

/**
 * Le bloc de sortie, identique pour les quatre agents d'axe.
 *
 * `champsSupplementaires` entre DANS l'objet JSON et non après lui : décrit en
 * dehors du schéma, un champ demandé en post-scriptum est omis une fois sur
 * deux. C'est ce qui faisait perdre le métier détecté, et avec lui la
 * fourchette de salaire et le nombre d'offres.
 */
export function formatSortieAxe(
  clesMarqueurs: readonly string[],
  champsSupplementaires: string[] = [],
): string {
  const lignes = [
    `  "marqueurs": [`,
    clesMarqueurs
      .map(
        (cle) =>
          `    { "cle": "${cle}", "note": <0-3 ou null>, "constat": "<ce que vous lisez dans CE CV>", "correctif": "<l'action précise>" }`,
      )
      .join(",\n"),
    `  ],`,
    ...champsSupplementaires.map((c) => `  ${c},`),
    `  "verdict": "<une à deux phrases qui résument l'axe>"`,
  ];

  return `Répondez UNIQUEMENT avec cet objet JSON :
{
${lignes.join("\n")}
}

Les ${clesMarqueurs.length} marqueurs doivent tous être présents, dans cet ordre, avec exactement ces clés.${
    champsSupplementaires.length
      ? `\nLes ${champsSupplementaires.length} autres champs sont obligatoires eux aussi : ne les omettez jamais.`
      : ""
  }`;
}
