# Installation — marche à suivre

Pour Vincent.

Tout le code est dans `code/`, et un script fait le branchement. Il n'y a rien
à recopier à la main, rien à chercher dans `App.tsx`.

---

## L'installation, en une commande

Dans le shell Replit, à la racine du projet :

```bash
node docs/lead-magnet-analyse-cv/install.mjs
```

C'est tout. Le script :

1. copie les **15 fichiers** du lead magnet à leur emplacement ;
2. ajoute l'import et l'appel de `registerLeadMagnetRoutes` dans `server/routes.ts` ;
3. déclare les trois pages dans `client/src/App.tsx` **et ajoute leurs routes
   dans chacun de ses blocs de routing** — il y en a trois, un par état de
   connexion, et une route absente d'un bloc donne un 404 à une partie des
   visiteurs ;
4. relit tout et affiche ce qui manque.

Il est **idempotent** : le relancer ne duplique rien. Chaque ligne est ajoutée
seulement si elle manque. Le dépôt contient déjà une partie du branchement — la
route `/lm/analyse-de-cv` existait avant ce lot — et le script complète sans y
toucher.

Il ne modifie jamais un fichier existant sans le dire, et il s'arrête plutôt que
de patcher à l'aveugle si un point d'ancrage a disparu.

### Les deux autres modes

```bash
node docs/lead-magnet-analyse-cv/install.mjs --check   # dit ce qui manque, n'écrit rien
node docs/lead-magnet-analyse-cv/install.mjs --force   # écrase les fichiers qui diffèrent
```

`--force` ne sert que si quelqu'un a modifié un fichier du lead magnet sur
place : par défaut le script refuse d'écraser et le signale.

### Ce que ça donne

```
1. Fichiers du lead magnet
  ✓ client/src/components/LmCtaOffres.tsx
  ✓ client/src/components/LmInscriptionDialog.tsx
  … 15 fichiers

2. Route serveur
  ✓ import de registerLeadMagnetRoutes — ajouté à 1 endroit
  ✓ appel de registerLeadMagnetRoutes — ajouté à 1 endroit

3. Pages et routes
  · import différé LmAnalyseCv — déjà en place
  ✓ import différé LmAnalyseCvChargement — ajouté à 1 endroit
  ✓ route /lm/analyse-de-cv/chargement — ajouté à 3 endroits
  ✓ route /lm/analyse-de-cv/resultat/:id — ajouté à 3 endroits

4. Relecture
  ✓ 9 fichiers clés présents
  ✓ endpoint branché dans routes.ts
  ✓ les trois routes sont présentes dans 3 bloc(s) de routing
  ✓ clé IA présente (Mistral)

Résultat
  ✓ installation terminée.
```

Le script sort en **code 0** si tout va bien, **1** s'il reste quelque chose à
traiter — il liste alors les points précis.

---

## Ensuite

- [ ] `npm run check` — aucune **nouvelle** erreur. Le projet en compte déjà 2
      dans `client/src/components/ContentBlock.tsx` (`referrerPolicy` sur
      `<video>`), sans rapport avec le lead magnet.
- [ ] **Redémarrer le serveur** — `tsx` ne surveille pas les fichiers, les
      changements serveur ne sont pas pris à chaud.
- [ ] Vérifier que `MISTRAL_API_KEY` est dans les Replit Secrets.

Aucune variable d'environnement nouvelle, aucune dépendance à installer :
`pdf-parse`, `mammoth`, les composants shadcn (`dialog`, `button`, `input`,
`label`), `lucide-react` et `wouter` sont déjà là.

Sans clé IA, l'endpoint répond **503** avec un message honnête (« indisponible
de notre côté, ce n'est pas votre fichier ») au lieu d'inviter à réessayer dans
le vide.

---

## Recette

### Le parcours

- [ ] `/lm/analyse-de-cv` s'affiche, logo en haut à gauche, aperçu animé à droite
- [ ] Déposer un PDF texte → l'anneau de chargement monte, le `%` est collé au chiffre
- [ ] Le rapport s'affiche en 10 à 20 secondes
- [ ] Le bandeau nom / métier / ancienneté est renseigné

### Le contenu

- [ ] L'effet miroir est lisible et **non flouté**
- [ ] Les constats citent des éléments réels du CV, pas des généralités
- [ ] Chaque axe montre **2 marqueurs en clair et 3 floutés**
- [ ] Le plan d'action montre la 1re action, les suivantes floutées
- [ ] Le radar « Profil 360° » est flouté

### Le déverrouillage

- [ ] « Déverrouiller » ouvre **la popup** — pas le rapport
- [ ] La popup affiche « *nom-du-fichier* est déjà rattaché »
- [ ] L'e-mail est pré-rempli avec celui saisi au dépôt
- [ ] Créer le compte → le CV est dans le profil, **sans redépôt**
- [ ] « J'ai déjà un compte » ouvre la popup en mode connexion

### Les CTA

- [ ] Bandeau vert entre **ATS et Qualité** : « Pendant que vous corrigez »
- [ ] Bandeau vert entre **Structure et le plan** : « Et une fois corrigé »
- [ ] Carte verte en colonne de droite avec le bouton blanc
- [ ] Les trois mènent à `/emploi?q=<métier>` et donnent des résultats
- [ ] Le nombre d'offres est **cohérent avec ce que montre le job board**

### Les cas limites

- [ ] PDF scanné → message qui explique quoi faire, pas une erreur générique
- [ ] Fichier de plus de 7 Mo → message clair
- [ ] E-mail invalide → refus avant tout appel IA
- [ ] 4 CV d'affilée **en production** → le 4e est refusé par le quota
- [ ] Une analyse qui échoue **ne consomme pas** de crédit du quota

### Avant d'ouvrir au public

- [ ] Sur l'URL publique, **le bandeau ambre « Mode aperçu » n'apparaît pas**
- [ ] Sur l'URL publique, « Déverrouiller » ouvre bien la popup

Le mode aperçu s'active en développement ou sur `?apercu=1`. Il déverrouille le
rapport sur place pour juger la maquette. Rien à retirer avant de déployer — il
suffit de vérifier les deux points ci-dessus.

---

## Reprise à la main

Si le script signale un point d'ancrage introuvable, c'est que le fichier a
changé depuis. Voici ce qu'il aurait fait.

### `server/routes.ts`

```ts
// avec les autres imports de routes
import { registerLeadMagnetRoutes } from "./routes/leadMagnetRoutes";

// dans registerRoutes(), avec les autres register*
registerLeadMagnetRoutes(app);
```

### `client/src/App.tsx`

Avec les autres `lazy()` :

```ts
const LmAnalyseCv = lazy(() => import("@/pages/LmAnalyseCv"));
const LmAnalyseCvChargement = lazy(() => import("@/pages/LmAnalyseCvChargement"));
const LmAnalyseCvResultat = lazy(() => import("@/pages/LmAnalyseCvResultat"));
```

Puis ces trois lignes dans **chaque** bloc de routing — cherchez toutes les
occurrences de `<Route path="/pricing" component={Pricing} />`, il y en a une
par bloc :

```tsx
<Route path="/lm/analyse-de-cv" component={LmAnalyseCv} />
<Route path="/lm/analyse-de-cv/chargement" component={LmAnalyseCvChargement} />
<Route path="/lm/analyse-de-cv/resultat/:id" component={LmAnalyseCvResultat} />
```

Relancez ensuite `install.mjs --check` pour confirmer.

---

## À arbitrer avant la mise en ligne

### Déplacer le parsing à l'inscription — recommandé

`parseCV` / `parseCVFromPDF` tourne aujourd'hui à **chaque analyse**, avant les
cinq agents. Or il ne sert qu'à rattacher le CV au compte : quelqu'un qui ne
s'inscrit pas l'a fait tourner pour rien.

Le déplacer dans le parcours d'inscription :
- supprime **un appel IA par CV analysé**, le plus cher (vision multi-pages) ;
- fait passer l'attente de **20 s à 10 s**.

Le fichier brut est déjà en session, tout est disponible côté popup.

- [ ] Arbitré

### Le quota

3 CV / heure / IP, décomptés **après** une analyse réussie. C'est la seule
surface où quelqu'un peut consommer du budget IA sans jamais s'inscrire.

- [ ] Valeur confirmée après une semaine de trafic réel

### Suivi du coût

Les appels passent déjà par `aiCallLogger` → table `ai_call_logs`. Le coût réel
par analyse y sera lisible dès la mise en production.

- [ ] Requête ou tableau de bord de suivi en place

---

## Points de vigilance

**`cvScoringRubric.ts` n'est pas touché.** C'est la grille de l'Agent de
Candidature, elle reste au produit. Le lead magnet a ses propres prompts. Les
deux peuvent diverger sans se gêner : l'un vend, l'autre accompagne.

**Ne pas remettre de fourchette de salaire.** Elle a été retirée du rapport
volontairement.

**La pondération est vérifiée au démarrage.** Modifier `POIDS_AXES` sans que la
somme fasse 100 empêche le serveur de démarrer, avec un message explicite. C'est
voulu : un score global calculé sur une pondération fausse ment sans prévenir.

**Les libellés de marqueurs vivent dans `index.ts`, pas dans les prompts.** Le
modèle ne renvoie que des clés. Un libellé généré changerait d'une analyse à
l'autre.
