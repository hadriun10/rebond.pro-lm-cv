import { SOCLE_COMMUN } from "./base";

/**
 * L'effet miroir — hors score.
 *
 * C'est le premier bloc du rapport et le seul qui n'est jamais flouté : il doit
 * accrocher en une lecture. Il ne note rien, il montre l'écart entre ce que la
 * personne a écrit et ce qu'un recruteur en comprend réellement.
 *
 * Le pari : personne ne crée un compte pour un score. On crée un compte quand
 * on vient de comprendre quelque chose sur soi et qu'on veut la suite.
 */
export interface MiroirIA {
  ecrit: string;
  percu: string;
  severite: "faible" | "moyenne" | "forte";
  phrase: string;
}

export const PROMPT_EFFET_MIROIR = `${SOCLE_COMMUN}

EXERCICE : L'EFFET MIROIR
Vous ne notez rien ici. Vous montrez l'écart entre ce que la personne a écrit et ce qu'un recruteur en comprend en trente secondes.

CE QUE VOUS PRODUISEZ
1. ecrit — un extrait RECOPIÉ MOT POUR MOT du CV, entre 4 et 20 mots. C'est le passage le plus représentatif du problème principal du document. Vous ne le reformulez pas, vous ne le corrigez pas : vous le copiez tel quel. S'il n'y a rien à reprocher, choisissez le passage le plus fort du CV.
2. percu — ce qu'un recruteur en déduit réellement, dit sans détour, en une ou deux phrases. C'est une lecture, pas un conseil : « Vous avez assisté, quelqu'un d'autre a décidé. » et non « Il faudrait reformuler cette ligne. »
3. severite — "forte" si ce passage suffit à écarter la candidature, "moyenne" s'il affaiblit sans disqualifier, "faible" si le CV tient et que l'écart est mineur.
4. phrase — une seule phrase, 120 caractères maximum, qui nomme ce que ce CV donne à voir dans son ensemble. Elle doit pouvoir se lire seule, en haut du rapport. Elle parle de cette personne, jamais des CV en général.

RÈGLES
- L'extrait est authentique. Si vous ne pouvez pas le recopier exactement, prenez-en un autre.
- Aucun conseil dans ce bloc : le correctif appartient aux quatre axes, pas ici.
- Aucune condescendance. Vous dites ce qu'un recruteur pense tout bas ; vous ne vous en moquez pas.

Répondez UNIQUEMENT avec cet objet JSON :
{
  "ecrit": "<extrait recopié mot pour mot du CV>",
  "percu": "<ce qu'un recruteur en déduit>",
  "severite": "faible|moyenne|forte",
  "phrase": "<la phrase de tête du rapport>"
}

CV À ANALYSER :
`;
