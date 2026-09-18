import { SOCLE_COMMUN, formatSortieAxe } from "./base";

/**
 * Axe 3 — Qualité (35 %, le poids le plus fort).
 *
 * La question posée : les expériences démontrent-elles, ou se contentent-elles
 * de décrire ?
 *
 * C'est le cœur de la méthode Rebond — STAR, OKR, MRR — et l'axe sur lequel
 * une personne progresse le plus vite. D'où la pondération : c'est lui qui rend
 * le plan d'action rentable dès la première lecture.
 */
export const MARQUEURS_QUALITE = [
  "resultats_chiffres",
  "verbes_action",
  "perimetre_personnel",
  "contexte_pose",
  "elements_differenciants",
] as const;

export const PROMPT_QUALITE = `${SOCLE_COMMUN}

AXE ANALYSÉ : QUALITÉ RÉDACTIONNELLE
Vos expériences démontrent-elles, ou se contentent-elles de décrire ?

LA MÉTHODE REBOND, QUI SERT DE RÉFÉRENCE
Une expérience bien écrite suit l'une de ces trois structures :
- STAR : Situation (contexte, secteur, enjeu) → Task (la mission confiée) → Action (ce que vous avez fait, avec quels moyens) → Result (le résultat chiffré).
- OKR : un objectif atteint, suivi de 2 ou 3 résultats mesurables.
- MRR : Mission (le périmètre) → Réalisation (le livrable produit) → Résultat (l'impact chiffré).
Forme visée d'une ligne : « [Verbe au passé] [quoi] [comment] : [résultat chiffré] », deux lignes maximum.

MARQUEURS À NOTER

1. resultats_chiffres — Y a-t-il un chiffre par expérience ?
   Un chiffre utile mesure un effet : pourcentage, euros, délai, volume, taille d'équipe, nombre de clients.
   Le budget d'un service que vous n'avez pas piloté n'est pas un résultat. « Amélioration de la satisfaction » sans chiffre n'est pas un résultat.
   Comptez combien d'expériences sur le total en portent au moins un, et dites-le.
   0 : aucun chiffre nulle part.
   3 : chaque expérience porte au moins un résultat quantifié.

2. verbes_action — Les lignes commencent-elles par un verbe fort ?
   Attendu : Déployé, Piloté, Réduit, Structuré, Négocié, Conçu, Coordonné, Doublé.
   À bannir : « Participation à », « En charge de », « Responsable de », « Missions diverses », « Aide à » — ces formules disent une présence, pas une action.
   Citez la formulation molle exacte que vous trouvez.
   0 : la majorité des lignes sont des intitulés de poste déguisés.
   3 : verbe d'action fort en tête de presque chaque ligne.

3. perimetre_personnel — Lit-on ce que VOUS avez fait ?
   Le « nous », « l'équipe a », « le service a » dissout la personne dans le groupe : un recruteur ne sait plus ce qu'il achète.
   0 : le CV décrit l'activité d'un service, pas le travail d'une personne.
   3 : votre périmètre propre est identifiable sur chaque poste.

4. contexte_pose — Le chiffre veut-il dire quelque chose ?
   « +30 % de chiffre d'affaires » ne signifie rien sans savoir sur quelle base, dans quel secteur, avec quelle équipe et en combien de temps.
   Attendu par expérience : le secteur, l'ordre de grandeur de la structure ou de l'équipe, l'enjeu du moment.
   0 : les réalisations flottent, aucun repère de taille ni d'enjeu.
   3 : chaque résultat est situé et devient comparable.

5. elements_differenciants — Vous confondrait-on avec deux cents autres candidats ?
   Cherchez ce qui n'est pas copiable : environnement exigeant ou très normé, exposition internationale réelle, transformation menée, projet personnel ou associatif révélateur, combinaison de compétences rare.
   À l'inverse, comptez comme signal négatif toute liste de qualités non prouvées : « dynamique », « rigoureux », « esprit d'équipe », « passionné ».
   0 : aucun élément singulier, et une liste de qualités interchangeables.
   3 : au moins deux éléments réellement distinctifs, et aucun cliché.

${formatSortieAxe(MARQUEURS_QUALITE)}

CV À ANALYSER :
`;
