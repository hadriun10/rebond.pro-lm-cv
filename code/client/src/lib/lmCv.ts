/**
 * Lead magnet « analyse de CV » — état partagé entre les trois écrans.
 *
 * Le parcours est en trois temps : dépôt → chargement → résultat. L'analyse
 * elle-même n'est pas persistée côté serveur (rien en base pour quelqu'un qui
 * n'a pas de compte), donc le rapport transite par le sessionStorage du
 * navigateur. C'est volontaire : le lien de résultat n'est pas partageable,
 * et le rapport disparaît à la fermeture de l'onglet.
 */

export type CleAxe = "completude" | "ats" | "qualite" | "structure";

export interface Marqueur {
  cle: string;
  libelle: string;
  note: number | null;
  constat: string;
  correctif: string;
}

export interface Axe {
  cle: CleAxe;
  libelle: string;
  question: string;
  poids: number;
  score: number;
  verdict: string;
  marqueurs: Marqueur[];
}

export interface Action {
  rang: number;
  axe: CleAxe;
  titre: string;
  constat: string;
  correctif: string;
}

export interface Miroir {
  ecrit: string;
  percu: string;
  severite: "faible" | "moyenne" | "forte";
  phrase: string;
}

export interface Rapport {
  scoreGlobal: number;
  metier: string;
  anneesExperience: number | null;
  miroir: Miroir | null;
  axes: Axe[];
  planAction: Action[];
  offresOuvertes: number;
  cvParse: any;
}

/**
 * Le fichier déposé, conservé sous la forme qu'attend `/api/auth/cv-register`.
 *
 * C'est ce qui permet à la popup d'inscription de créer le compte avec le CV
 * déjà rattaché : la personne a déposé son CV une fois, on ne le lui redemande
 * pas pour débloquer son propre rapport.
 */
export interface FichierCv {
  name: string;
  content: string;
  mimeType: string;
}

/** Ce que l'écran de dépôt transmet à l'écran de chargement. */
export interface DemandeAnalyse {
  fileData: string;
  fileName: string;
  mimeType: string;
  email: string;
  consentCv: boolean;
  consentInfos: boolean;
}

const CLE_DEMANDE = "lm_cv_demande";
const PREFIXE_RAPPORT = "lm_cv_rapport_";
const CLE_PARSE = "lm_cv_parse";
const CLE_FICHIER = "lm_cv_fichier";
const CLE_EMAIL = "lm_cv_email";

function lire<T>(cle: string): T | null {
  try {
    const brut = sessionStorage.getItem(cle);
    return brut ? (JSON.parse(brut) as T) : null;
  } catch {
    return null;
  }
}

function ecrire(cle: string, valeur: unknown): boolean {
  try {
    sessionStorage.setItem(cle, JSON.stringify(valeur));
    return true;
  } catch {
    // Navigation privée ou quota : le parcours continue sans mémoire.
    return false;
  }
}

export const demande = {
  poser: (d: DemandeAnalyse) => ecrire(CLE_DEMANDE, d),
  prendre: (): DemandeAnalyse | null => {
    const d = lire<DemandeAnalyse>(CLE_DEMANDE);
    // Consommée une seule fois : un rechargement de la page de chargement ne
    // doit pas relancer une analyse (et donc cinq appels IA) en douce.
    try {
      sessionStorage.removeItem(CLE_DEMANDE);
    } catch {
      /* ignore */
    }
    // Le fichier et l'e-mail survivent à la demande : la popup d'inscription
    // en a besoin, et elle s'ouvre bien après que l'analyse soit finie.
    if (d) {
      ecrire(CLE_FICHIER, { name: d.fileName, content: d.fileData, mimeType: d.mimeType });
      ecrire(CLE_EMAIL, d.email);
    }
    return d;
  },
};

export const rapport = {
  poser: (id: string, r: Rapport) => {
    ecrire(PREFIXE_RAPPORT + id, r);
    if (r.cvParse) ecrire(CLE_PARSE, r.cvParse);
  },
  lire: (id: string) => lire<Rapport>(PREFIXE_RAPPORT + id),
};

/** Ce que la popup d'inscription retrouve du dépôt initial. */
export const depot = {
  fichier: () => lire<FichierCv>(CLE_FICHIER),
  cvParse: () => lire<any>(CLE_PARSE),
  email: () => lire<string>(CLE_EMAIL) ?? "",
};

/** Identifiant court et lisible, suffisant pour une clé de session. */
export function nouvelId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Le verdict affiché sous le score global. */
export function verdict(score: number): string {
  if (score < 40) return "Votre CV vous dessert aujourd'hui";
  if (score < 60) return "Votre CV passe difficilement";
  if (score < 80) return "Votre CV passe, mais vous laissez des points";
  return "Votre CV tient la route";
}

/**
 * Les marqueurs montrés en clair, et ceux qu'on garde.
 *
 * On révèle les deux mieux notés : ils prouvent que l'analyse a réellement lu
 * le CV. Ce qui reste caché, ce sont les problèmes — c'est-à-dire précisément
 * ce que la personne est venue chercher.
 */
export function partagerMarqueurs(marqueurs: Marqueur[]): { visibles: Marqueur[]; caches: Marqueur[] } {
  const tries = [...marqueurs].sort((a, b) => (b.note ?? -1) - (a.note ?? -1));
  return { visibles: tries.slice(0, 2), caches: tries.slice(2) };
}
