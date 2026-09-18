# Lead magnet « Analyse de CV »

Outil public, utilisable sans compte, qui note un CV sur les quatre axes Rebond,
rend un premier niveau de résultat, et garde le reste derrière la création de
compte.

Ce dépôt contient **tout le code** et de quoi l'installer en une commande.

## Installation

Déposez ce dossier **dans le projet Rebond** — n'importe où à l'intérieur,
`docs/lead-magnet-analyse-cv/` par convention :

```bash
# depuis la racine du projet Rebond
git clone https://github.com/hadriun10/rebond.pro-lm-cv.git docs/lead-magnet-analyse-cv
node docs/lead-magnet-analyse-cv/install.mjs
```

Sur Replit, si `git clone` n'est pas pratique : télécharger le ZIP du dépôt,
le décompresser dans `docs/`, puis lancer la même commande.

L'installeur remonte l'arborescence jusqu'au `package.json` du projet : il
fonctionne quel que soit l'endroit où vous avez posé le dossier, du moment
qu'il est **à l'intérieur** du projet Rebond.

Le script copie les 15 fichiers, branche la route serveur, déclare les trois
pages dans `App.tsx` — dans chacun de ses blocs de routing — puis relit tout et
dit ce qui manque. Il est idempotent et ne touche à rien sans le dire.

| Fichier | Quoi |
|---|---|
| `install.mjs` | l'installeur (`--check` pour vérifier, `--force` pour écraser) |
| `TODO.md` | la marche à suivre, la recette, les arbitrages, la reprise à la main |
| `README.md` | ce document : comment ça marche et pourquoi |
| `code/` | les 15 fichiers, rangés à leur emplacement exact dans le projet |

---

## 1. Le parcours, en trois écrans

| Écran | Route | Rôle |
|---|---|---|
| Dépôt | `/lm/analyse-de-cv` | Collecte le fichier, l'e-mail, les consentements. Affiche un aperçu animé du rapport à droite. |
| Chargement | `/lm/analyse-de-cv/chargement` | Lance l'analyse, occupe l'attente (anneau de progression, phases, astuces). |
| Résultat | `/lm/analyse-de-cv/resultat/:id` | Rapport partiellement flouté, popup d'inscription, CTA vers les offres. |

Le rapport **n'est jamais stocké en base**. Il transite par le `sessionStorage`
du navigateur : le lien n'est pas partageable et tout disparaît à la fermeture
de l'onglet. C'est volontaire — rien n'est conservé côté serveur pour quelqu'un
qui n'a pas de compte.

Seule écriture en base : un lead dans `waitlist` (`source: "lm-analyse-cv"`), et
uniquement si la personne a coché le consentement.

---

## 2. L'analyse

### Cinq agents en parallèle

Un agent LLM par axe, plus l'effet miroir. Le découpage coûte cinq appels au
lieu d'un, mais chaque agent ne regarde qu'une chose : les constats citent le CV
au lieu de paraphraser une grille générique.

| Axe | Poids | Question posée |
|---|---|---|
| **Complétude** | 25 % | Tout ce qu'un recruteur doit trouver y est-il, sans trou ? |
| **ATS** | 20 % | Le CV franchit-il le filtre des logiciels de tri ? |
| **Qualité** | 35 % | Les expériences démontrent-elles, ou décrivent-elles ? |
| **Structure** | 20 % | Tient-il les trente secondes du recruteur ? |

Cinq marqueurs par axe, notés de 0 à 3. La pondération est vérifiée au
démarrage : si elle ne fait pas 100, le serveur refuse de démarrer.

**Le modèle ne calcule aucun score.** Il note les marqueurs ; les scores d'axe
et le score global sont calculés dans `lmCvAnalysisService.ts`. Deux analyses du
même CV donnent donc la même arithmétique, et une note ne peut pas contredire le
constat affiché juste à côté.

**Le plan d'action n'est pas généré non plus.** Il se déduit des notes : chaque
marqueur est classé par manque à gagner réel — l'écart à 3 multiplié par le
poids de l'axe. Un 0 sur Qualité (35 %) passe avant un 1 sur ATS (20 %).

### L'effet miroir

Hors score. C'est le premier bloc du rapport et le seul qui n'est **jamais
flouté** : « ce que vous avez écrit » face à « ce qu'un recruteur comprend ».
Le pari : personne ne crée un compte pour un score, on en crée un quand on vient
de comprendre quelque chose sur soi.

### Provider IA

`aiFactory.getProviderForLocation("FR")` → Mistral (`mistral-large-latest`),
repli automatique sur OpenAI si Mistral tombe. Le pays est codé en dur : l'outil
est public, il n'y a pas de compte d'où lire une localisation.

⚠️ Le parsing du CV (`parseCV` / `parseCVFromPDF`) reçoit **explicitement
`"FR"`** dans `leadMagnetRoutes.ts`. Sans ce paramètre, il partait chez OpenAI
alors que le reste de l'analyse restait souverain.

---

## 3. Le floutage

Repris du lead magnet de Rheso.Tech, qui est la référence.

| Élément | État initial |
|---|---|
| Effet miroir | **visible** — c'est le crochet |
| Score global, anneau animé | **visible** |
| Score et verdict de chaque axe | **visible** |
| Marqueurs | les **2 mieux notés** en clair, les 3 autres floutés |
| Radar « Profil 360° » | flouté |
| Plan d'action | **1re action** en clair, les suivantes floutées |

On révèle les meilleurs marqueurs : ils prouvent que l'analyse a lu le CV. Ce
qui reste caché, ce sont les problèmes — c'est-à-dire ce que la personne est
venue chercher.

**Il n'existe aucun moyen de déverrouiller sans compte.** Tous les boutons
ouvrent `LmInscriptionDialog`.

### Le mode aperçu

`LmAnalyseCvResultat.tsx` contient un mode aperçu, actif **en développement ou
sur `?apercu=1`** : « Déverrouiller » ouvre le rapport sur place, pour juger la
maquette sans créer un compte à chaque essai. Un bandeau ambre le signale.

En production (`import.meta.env.DEV` faux, pas de `?apercu`), le bouton ouvre la
popup. **Rien à retirer avant de déployer** — mais vérifier que le bandeau ambre
n'apparaît pas sur l'URL publique.

---

## 4. La popup d'inscription

`LmInscriptionDialog.tsx`. Elle ne redemande jamais le CV : le fichier brut et
sa version parsée sont déjà en `sessionStorage` depuis le dépôt.

- **Inscription** → `POST /api/auth/cv-register` avec `{ cvData, password, cvFile, isProfilePublic }`.
  C'est la route que Rebond utilise déjà pour l'inscription avec CV : la personne
  arrive sur la plateforme avec ses expériences déjà remplies.
- **Repli** (le parsing avait échoué) → `POST /api/auth/register`.
- **Connexion** → `POST /api/auth/login`.

L'e-mail est pré-rempli avec celui saisi au dépôt.

---

## 5. Les CTA vers les offres

`LmCtaOffres.tsx` — trois blocs, du plus léger au plus engageant :

| Composant | Où | Destination |
|---|---|---|
| `CarteOffres` | colonne de droite, toujours visible | `/emploi?q=<métier>` |
| `BandeauOffres` | après le plan, **une fois déverrouillé** | `/emploi?q=<métier>` |
| `BlocSuite` | fin de rapport, **une fois déverrouillé** | `/signup` + `/emploi` |

`/emploi` est le job board **public** : on peut y envoyer quelqu'un sans compte,
ce qui évite de redemander un engagement à quelqu'un qui vient d'en donner un.

Le nombre d'offres vient d'un `COUNT` réel sur `global_job_pool` en statut
`active`, filtré sur le métier détecté. **S'il vaut 0, les CTA chiffrés
disparaissent** : un chiffre gonflé se retourne contre nous à la seconde où la
personne arrive sur le job board et n'en trouve que douze.

---

## 6. Garde-fous

| Garde-fou | Où | Pourquoi |
|---|---|---|
| Quota 3 CV / heure / IP | `leadMagnetRoutes.ts` | un appel = cinq appels IA facturés |
| Décompte **après** succès | `enregistrerAnalyse()` | un plantage ne doit pas brûler un essai |
| Quota désactivé hors prod | `QUOTA_ACTIF` | on itère sur le même CV en développement |
| Délai de 4 s sur les requêtes marché | `avecDelai()` | une base lente ne doit pas retenir le rapport |
| PDF scanné refusé | `extraireContenu()` | sans couche texte, on ne peut rien dire d'honnête |
| Erreur 503 explicite si clé IA absente | `estPanneDeConfiguration()` | « réessayez » est faux quand rien ne peut marcher |

---

## 7. Coût

Par CV analysé : **5 appels IA** (4 axes + miroir) **plus 1 appel de parsing**,
soit environ 12 000 tokens en entrée et 3 000 en sortie, auxquels s'ajoute le
parsing vision pour les PDF (conversion en images, jusqu'à 6 pages).

Mesuré en local : **6 s** pour les cinq agents seuls, **12 à 20 s** via l'API
complète — l'écart, c'est le parsing, qui tourne séquentiellement avant.

**Optimisation identifiée, non faite** : le parsing ne sert qu'à rattacher le CV
au compte. Le déplacer au moment de l'inscription supprimerait un appel IA par
CV analysé et diviserait le temps d'attente par deux. Voir `TODO.md`.
