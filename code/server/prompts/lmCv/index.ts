import { type AxeLm, LIBELLES_AXES, POIDS_AXES, AXES_LM } from "./base";
import { PROMPT_COMPLETUDE, MARQUEURS_COMPLETUDE } from "./completude";
import { PROMPT_ATS, MARQUEURS_ATS } from "./ats";
import { PROMPT_QUALITE, MARQUEURS_QUALITE } from "./qualite";
import { PROMPT_STRUCTURE, MARQUEURS_STRUCTURE } from "./structure";

export * from "./base";
export { PROMPT_EFFET_MIROIR, type MiroirIA } from "./effetMiroir";

/**
 * Le registre des quatre agents.
 *
 * Les libellés de marqueurs vivent ici et pas dans le prompt : le modèle ne
 * renvoie que des clés, jamais du texte d'interface. Un intitulé qui change à
 * l'écran ne doit pas obliger à retoucher un prompt — et surtout, un intitulé
 * généré serait différent d'une analyse à l'autre.
 */
export interface DefinitionAxe {
  cle: AxeLm;
  libelle: string;
  poids: number;
  /** Ce que l'axe cherche à savoir, affiché sous son titre. */
  question: string;
  prompt: string;
  marqueurs: { cle: string; libelle: string }[];
}

const LIBELLES_MARQUEURS: Record<string, string> = {
  // Complétude
  experiences_completes: "Expériences complètes et datées",
  trous_expliques: "Interruptions assumées",
  contact_exhaustif: "Coordonnées complètes",
  formation_calibree: "Formation proportionnée",
  langues_et_competences_prouvees: "Langues et compétences prouvées",
  // ATS
  parsabilite: "Lisible par la machine",
  intitules_standards: "Sections nommées standard",
  dates_normalisees: "Dates au même format",
  mots_cles_metier: "Mots-clés du métier présents",
  fichier_propre: "Aucun élément illisible",
  // Qualité
  resultats_chiffres: "Résultats chiffrés",
  verbes_action: "Verbes d'action",
  perimetre_personnel: "Votre périmètre, pas celui de l'équipe",
  contexte_pose: "Contexte qui donne du sens aux chiffres",
  elements_differenciants: "Ce qui vous distingue",
  // Structure
  titre_poste_vise: "Titre du poste visé",
  accroche_unique: "Accroche qui n'appartient qu'à vous",
  longueur_calibree: "Longueur proportionnée",
  hierarchie_lecture: "L'essentiel en haut",
  lignes_courtes: "Lisible en diagonale",
};

function marqueurs(cles: readonly string[]) {
  return cles.map((cle) => ({ cle, libelle: LIBELLES_MARQUEURS[cle] ?? cle }));
}

export const AGENTS_AXES: DefinitionAxe[] = [
  {
    cle: "completude",
    libelle: LIBELLES_AXES.completude,
    poids: POIDS_AXES.completude,
    question: "Tout ce qu'un recruteur doit trouver y est-il, sans trou ?",
    prompt: PROMPT_COMPLETUDE,
    marqueurs: marqueurs(MARQUEURS_COMPLETUDE),
  },
  {
    cle: "ats",
    libelle: LIBELLES_AXES.ats,
    poids: POIDS_AXES.ats,
    question: "Votre CV franchit-il le filtre des logiciels de tri ?",
    prompt: PROMPT_ATS,
    marqueurs: marqueurs(MARQUEURS_ATS),
  },
  {
    cle: "qualite",
    libelle: LIBELLES_AXES.qualite,
    poids: POIDS_AXES.qualite,
    question: "Vos expériences démontrent-elles, ou décrivent-elles ?",
    prompt: PROMPT_QUALITE,
    marqueurs: marqueurs(MARQUEURS_QUALITE),
  },
  {
    cle: "structure",
    libelle: LIBELLES_AXES.structure,
    poids: POIDS_AXES.structure,
    question: "Tient-il les trente secondes du recruteur ?",
    prompt: PROMPT_STRUCTURE,
    marqueurs: marqueurs(MARQUEURS_STRUCTURE),
  },
];

/** Garde-fou : la pondération doit faire 100, sinon le score global ment. */
const TOTAL_POIDS = AXES_LM.reduce((s, a) => s + POIDS_AXES[a], 0);
if (TOTAL_POIDS !== 100) {
  throw new Error(`[lmCv] pondération des axes invalide : ${TOTAL_POIDS} au lieu de 100`);
}
