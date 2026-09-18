#!/usr/bin/env node
/**
 * Installeur du lead magnet « Analyse de CV ».
 *
 *   node docs/lead-magnet-analyse-cv/install.mjs          installe
 *   node docs/lead-magnet-analyse-cv/install.mjs --check  vérifie sans rien écrire
 *   node docs/lead-magnet-analyse-cv/install.mjs --force  écrase les fichiers qui diffèrent
 *
 * Ce qu'il fait :
 *   1. copie les fichiers du lead magnet à leur emplacement ;
 *   2. branche la route serveur dans `server/routes.ts` ;
 *   3. déclare les trois pages dans `client/src/App.tsx`, dans CHACUN de ses
 *      blocs de routing — il y en a plusieurs selon l'état de connexion, et une
 *      route absente d'un bloc donne un 404 pour la moitié des visiteurs ;
 *   4. relit tout et dit ce qui manque.
 *
 * Idempotent : chaque ligne est ajoutée seulement si elle manque, une par une.
 * Le dépôt contient peut-être déjà une partie du branchement — c'est le cas de
 * la route `/lm/analyse-de-cv`, présente avant ce lot. Le script complète sans
 * dupliquer.
 *
 * Il s'arrête plutôt que de patcher à l'aveugle si un point d'ancrage a disparu.
 */

import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ICI = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(ICI, "code");

const CHECK = process.argv.includes("--check");
const FORCE = process.argv.includes("--force");

const C = { vert: "\x1b[32m", rouge: "\x1b[31m", jaune: "\x1b[33m", gris: "\x1b[90m", gras: "\x1b[1m", raz: "\x1b[0m" };
const ok = (m) => console.log(`  ${C.vert}✓${C.raz} ${m}`);
const info = (m) => console.log(`  ${C.gris}·${C.raz} ${m}`);
const attention = (m) => console.log(`  ${C.jaune}!${C.raz} ${m}`);
const erreur = (m) => console.log(`  ${C.rouge}✗${C.raz} ${m}`);
const titre = (m) => console.log(`\n${C.gras}${m}${C.raz}`);

const problemes = [];

// ── Racine du projet ────────────────────────────────────────────────────────
function racineProjet() {
  let d = ICI;
  for (let i = 0; i < 6; i++) {
    const pkg = join(d, "package.json");
    if (existsSync(pkg)) {
      try {
        if (JSON.parse(readFileSync(pkg, "utf8")).name) return d;
      } catch {
        /* illisible : on remonte */
      }
    }
    d = dirname(d);
  }
  return null;
}

const RACINE = racineProjet();
if (!RACINE) {
  erreur("Racine du projet introuvable. Lancez ce script depuis le dépôt Rebond.");
  process.exit(1);
}

// ── 1. Les fichiers ─────────────────────────────────────────────────────────
function listerFichiers(dir, base = dir) {
  return readdirSync(dir).flatMap((nom) => {
    const complet = join(dir, nom);
    return statSync(complet).isDirectory() ? listerFichiers(complet, base) : [relative(base, complet)];
  });
}

function copierFichiers() {
  titre("1. Fichiers du lead magnet");

  if (!existsSync(SOURCE)) {
    erreur(`Dossier source introuvable : ${SOURCE}`);
    problemes.push("dossier code/ absent");
    return;
  }

  let copies = 0;
  let inchanges = 0;

  for (const chemin of listerFichiers(SOURCE).sort()) {
    const vers = join(RACINE, chemin);
    const contenu = readFileSync(join(SOURCE, chemin), "utf8");

    if (existsSync(vers)) {
      if (readFileSync(vers, "utf8") === contenu) {
        inchanges++;
        continue;
      }
      if (!FORCE) {
        attention(`${chemin} — existe et diffère, laissé tel quel (--force pour écraser)`);
        problemes.push(`${chemin} diffère de la version livrée`);
        continue;
      }
    }

    if (CHECK) {
      attention(`${chemin} — à copier`);
      problemes.push(`${chemin} à copier`);
      continue;
    }

    mkdirSync(dirname(vers), { recursive: true });
    writeFileSync(vers, contenu);
    ok(chemin);
    copies++;
  }

  if (inchanges) info(`${inchanges} fichier(s) déjà à jour`);
  if (!copies && !problemes.length) ok("tous les fichiers sont en place");
}

// ── Insertion ligne à ligne ─────────────────────────────────────────────────
/**
 * Ajoute `ligne` après chaque ligne contenant `ancre`, sauf là où elle est déjà.
 *
 * L'indentation est recopiée depuis la ligne d'ancrage : `App.tsx` n'indente
 * pas ses blocs de routing de la même façon, et une insertion à indentation
 * fixe produirait un fichier valide mais illisible.
 *
 * `ancres` peut contenir plusieurs candidats : le premier présent gagne. Cela
 * permet de se raccrocher à une ligne du lot précédent si elle existe, et de
 * retomber sur une ancre plus ancienne sinon.
 */
function assurerLigne({ fichier, ligne, presence, ancres, quoi, uneSeule = false }) {
  const chemin = join(RACINE, fichier);

  if (!existsSync(chemin)) {
    erreur(`${fichier} introuvable`);
    problemes.push(`${fichier} introuvable`);
    return;
  }

  const lignes = readFileSync(chemin, "utf8").split("\n");
  const ancre = ancres.find((a) => lignes.some((l) => l.includes(a)));

  if (!ancre) {
    erreur(`${quoi} — aucun point d'ancrage trouvé dans ${fichier}`);
    ancres.forEach((a) => erreur(`    cherché : ${a}`));
    problemes.push(`${quoi} : à brancher à la main`);
    return;
  }

  // Les index des lignes d'ancrage qui ne sont pas déjà suivies de notre ligne.
  const aTraiter = [];
  lignes.forEach((l, i) => {
    if (!l.includes(ancre)) return;
    const suite = lignes.slice(i + 1, i + 6).join("\n");
    if (!suite.includes(presence)) aTraiter.push(i);
  });

  if (aTraiter.length === 0) {
    info(`${quoi} — déjà en place`);
    return;
  }

  const cibles = uneSeule ? aTraiter.slice(0, 1) : aTraiter;

  if (CHECK) {
    attention(`${quoi} — à ajouter (${cibles.length} endroit${cibles.length > 1 ? "s" : ""})`);
    problemes.push(`${quoi} non branché`);
    return;
  }

  // De la fin vers le début : insérer décale les index suivants.
  for (const i of [...cibles].reverse()) {
    const indentation = lignes[i].match(/^\s*/)[0];
    lignes.splice(i + 1, 0, indentation + ligne);
  }

  writeFileSync(chemin, lignes.join("\n"));
  ok(`${quoi} — ajouté à ${cibles.length} endroit${cibles.length > 1 ? "s" : ""}`);
}

// ── 2. Le serveur ───────────────────────────────────────────────────────────
function brancherServeur() {
  titre("2. Route serveur");

  assurerLigne({
    fichier: "server/routes.ts",
    ligne: `import { registerLeadMagnetRoutes } from "./routes/leadMagnetRoutes";`,
    presence: `registerLeadMagnetRoutes } from`,
    ancres: [`import { registerCvStudioRoutes } from "./routes/cvStudioRoutes";`],
    quoi: "import de registerLeadMagnetRoutes",
    uneSeule: true,
  });

  assurerLigne({
    fichier: "server/routes.ts",
    ligne: `registerLeadMagnetRoutes(app);`,
    presence: `registerLeadMagnetRoutes(app);`,
    ancres: [`  registerCvStudioRoutes(app);`],
    quoi: "appel de registerLeadMagnetRoutes",
    uneSeule: true,
  });
}

// ── 3. Le front ─────────────────────────────────────────────────────────────
function brancherFront() {
  titre("3. Pages et routes");

  const APP = "client/src/App.tsx";
  const lazyPricing = `const Pricing = lazy(() => import("@/pages/Pricing"));`;
  const lazyDepot = `const LmAnalyseCv = lazy(() => import("@/pages/LmAnalyseCv"));`;
  const lazyChargement = `const LmAnalyseCvChargement = lazy(() => import("@/pages/LmAnalyseCvChargement"));`;

  // Les trois imports différés, chacun ajouté seulement s'il manque.
  assurerLigne({
    fichier: APP,
    ligne: lazyDepot,
    presence: `const LmAnalyseCv = lazy(`,
    ancres: [lazyPricing],
    quoi: "import différé LmAnalyseCv",
    uneSeule: true,
  });

  assurerLigne({
    fichier: APP,
    ligne: lazyChargement,
    presence: `LmAnalyseCvChargement = lazy(`,
    ancres: [lazyDepot, lazyPricing],
    quoi: "import différé LmAnalyseCvChargement",
    uneSeule: true,
  });

  assurerLigne({
    fichier: APP,
    ligne: `const LmAnalyseCvResultat = lazy(() => import("@/pages/LmAnalyseCvResultat"));`,
    presence: `LmAnalyseCvResultat = lazy(`,
    ancres: [lazyChargement, lazyDepot, lazyPricing],
    quoi: "import différé LmAnalyseCvResultat",
    uneSeule: true,
  });

  // Les routes, dans TOUS les blocs de routing.
  const routeDepot = `<Route path="/lm/analyse-de-cv" component={LmAnalyseCv} />`;
  const routeChargement = `<Route path="/lm/analyse-de-cv/chargement" component={LmAnalyseCvChargement} />`;

  assurerLigne({
    fichier: APP,
    ligne: routeDepot,
    presence: `path="/lm/analyse-de-cv"`,
    ancres: [`<Route path="/pricing" component={Pricing} />`],
    quoi: "route /lm/analyse-de-cv",
  });

  assurerLigne({
    fichier: APP,
    ligne: routeChargement,
    presence: `path="/lm/analyse-de-cv/chargement"`,
    ancres: [routeDepot],
    quoi: "route /lm/analyse-de-cv/chargement",
  });

  assurerLigne({
    fichier: APP,
    ligne: `<Route path="/lm/analyse-de-cv/resultat/:id" component={LmAnalyseCvResultat} />`,
    presence: `path="/lm/analyse-de-cv/resultat/:id"`,
    ancres: [routeChargement, routeDepot],
    quoi: "route /lm/analyse-de-cv/resultat/:id",
  });
}

// ── 4. Relecture ────────────────────────────────────────────────────────────
function relire() {
  titre("4. Relecture");

  const attendus = [
    ["server/prompts/lmCv/index.ts", "registre des quatre agents"],
    ["server/services/lmCvAnalysisService.ts", "orchestration"],
    ["server/routes/leadMagnetRoutes.ts", "endpoint public"],
    ["client/src/lib/lmCv.ts", "état de session"],
    ["client/src/pages/LmAnalyseCv.tsx", "écran de dépôt"],
    ["client/src/pages/LmAnalyseCvChargement.tsx", "écran de chargement"],
    ["client/src/pages/LmAnalyseCvResultat.tsx", "rapport"],
    ["client/src/components/LmInscriptionDialog.tsx", "popup de déverrouillage"],
    ["client/src/components/LmCtaOffres.tsx", "appels à l'action"],
  ];

  let manquants = 0;
  for (const [chemin, role] of attendus) {
    if (!existsSync(join(RACINE, chemin))) {
      erreur(`${role} manquant (${chemin})`);
      problemes.push(`${chemin} absent`);
      manquants++;
    }
  }
  if (!manquants) ok(`${attendus.length} fichiers clés présents`);

  const routes = readFileSync(join(RACINE, "server/routes.ts"), "utf8");
  if (routes.includes("registerLeadMagnetRoutes(app)")) ok("endpoint branché dans routes.ts");
  else {
    erreur("endpoint non branché dans routes.ts");
    problemes.push("registerLeadMagnetRoutes(app) absent");
  }

  const app = readFileSync(join(RACINE, "client/src/App.tsx"), "utf8");
  const nb = (s) => app.split(s).length - 1;
  const blocs = nb(`path="/pricing" component={Pricing}`);
  const depot = nb(`path="/lm/analyse-de-cv"`);
  const chargement = nb(`path="/lm/analyse-de-cv/chargement"`);
  const resultat = nb(`path="/lm/analyse-de-cv/resultat/:id"`);

  if (depot === chargement && chargement === resultat && depot >= Math.max(1, blocs)) {
    ok(`les trois routes sont présentes dans ${depot} bloc(s) de routing`);
  } else {
    erreur(`routes incomplètes : dépôt ${depot}, chargement ${chargement}, résultat ${resultat} (${blocs} blocs attendus)`);
    problemes.push("routes front incomplètes : 404 selon l'état de connexion");
  }

  if (!process.env.MISTRAL_API_KEY && !process.env.OPENAI_API_KEY) {
    attention("ni MISTRAL_API_KEY ni OPENAI_API_KEY dans l'environnement");
    attention("  l'endpoint répondra 503 avec un message explicite — ce n'est pas un plantage");
  } else {
    ok(`clé IA présente (${process.env.MISTRAL_API_KEY ? "Mistral" : "OpenAI seul, en repli"})`);
  }
}

// ── Exécution ───────────────────────────────────────────────────────────────
console.log(`${C.gras}Lead magnet « Analyse de CV » — ${CHECK ? "vérification" : "installation"}${C.raz}`);
info(`projet : ${RACINE}`);

copierFichiers();
brancherServeur();
brancherFront();
relire();

titre("Résultat");

if (problemes.length === 0) {
  ok(CHECK ? "tout est en place." : "installation terminée.");
  if (!CHECK) {
    console.log(`\n  Il reste à :`);
    console.log(`    1. npm run check          — aucune nouvelle erreur attendue`);
    console.log(`    2. redémarrer le serveur  — tsx ne surveille pas les fichiers`);
    console.log(`    3. ouvrir /lm/analyse-de-cv et dérouler la recette de TODO.md`);
  }
  process.exit(0);
}

erreur(`${problemes.length} point(s) à traiter :`);
problemes.forEach((p) => console.log(`      - ${p}`));
console.log(`\n  ${C.gris}Voir « Reprise à la main » dans TODO.md.${C.raz}`);
process.exit(1);
