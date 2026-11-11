/**
 * Reporte dans content/ les choix faits sur la page de vérification.
 * Lancé par le mainteneur, après « Enregistrer mes vérifications » :
 *
 *   npm run relecture:enregistrer                 (dernier fichier de Téléchargements)
 *   npm run relecture:enregistrer -- <fichier>    (fichier précis)
 *
 * Seules les fiches « Conforme » sont écrites. En cas d'erreur, tout est remis en l'état.
 */
import { execFile } from 'node:child_process';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { chargerContenu } from './lib/contenu.ts';
import { ecrire, exportSchema, planifier, restaurer } from './lib/enregistrement.ts';
import { PREFIXE_EXPORT, pageDeVerification } from './lib/relecture.ts';
import { chargerVerification, DOSSIER_LOCAL } from './lib/textes-locaux.ts';

const racine = process.cwd();
const executer = promisify(execFile);

async function dernierExport(): Promise<string | null> {
  const dossier = path.join(os.homedir(), 'Downloads');
  let noms: string[] = [];
  try {
    noms = (await readdir(dossier)).filter(
      (n) => n.startsWith(PREFIXE_EXPORT) && n.endsWith('.json'),
    );
  } catch {
    return null;
  }
  const dates = await Promise.all(
    noms.map(async (n) => ({ n, t: (await stat(path.join(dossier, n))).mtimeMs })),
  );
  const plusRecent = dates.sort((a, b) => b.t - a.t)[0];
  return plusRecent ? path.join(dossier, plusRecent.n) : null;
}

const fichier = process.argv[2] ?? (await dernierExport());
if (!fichier) {
  console.error(
    'Aucun fichier de vérifications trouvé dans Téléchargements. Sur la page, clique d’abord sur « Enregistrer mes vérifications ».',
  );
  process.exit(1);
}

const lu = exportSchema.safeParse(JSON.parse(await readFile(fichier, 'utf8')));
if (!lu.success) {
  console.error(`Ce fichier n'est pas un export de la page de vérification : ${fichier}`);
  process.exit(1);
}

const { contenu, fiches } = await chargerVerification(racine);
const mainteneur = contenu.infos?.mainteneur;
if (!mainteneur) {
  console.error('Identifiant du mainteneur absent de content/contenu.yaml.');
  process.exit(1);
}

const { ecritures, bilan } = planifier(fiches, lu.data.decisions, mainteneur);
console.log(`Fichier lu : ${fichier}`);

if (ecritures.length) {
  const originaux = await ecrire(racine, ecritures);
  const touches = [...originaux.keys()];
  // Même mise en forme que le reste du dépôt.
  await executer(path.join(racine, 'node_modules/.bin/biome'), ['format', '--write', ...touches], {
    cwd: racine,
  }).catch(() => undefined);
  const { erreurs } = await chargerContenu(racine);
  if (erreurs.length) {
    await restaurer(racine, originaux);
    console.error('Rien n’a été enregistré : le résultat aurait été invalide.');
    for (const e of erreurs.slice(0, 10)) console.error(`  - ${e.fichier} : ${e.message}`);
    console.error('Signale-le à Claude.');
    process.exit(1);
  }
  console.log(`${touches.length} fichier(s) de content/ mis à jour.`);
}

// Fiches à revoir : notées pour Claude.
const notes = bilan.aRevoir.map(
  ({ fiche, note }) => `- **${fiche.titre}** (${fiche.id})\n  ${note || '(sans remarque)'}`,
);
await writeFile(
  path.join(racine, DOSSIER_LOCAL, 'verification', 'a-revoir.md'),
  `# Fiches à revoir\n\n${notes.join('\n') || 'Aucune.'}\n`,
);

// Page mise à jour : les fiches enregistrées apparaissent comme faites.
const apres = await chargerVerification(racine);
await writeFile(
  path.join(racine, DOSSIER_LOCAL, 'relecture.html'),
  pageDeVerification(apres.fiches, apres.groupes, {
    date: new Date().toISOString().slice(0, 10),
    mainteneur,
  }),
);
const restantes = apres.fiches.filter((f) => !f.deja).length;

console.log('');
console.log(`Enregistrées comme vérifiées : ${bilan.enregistrees.length} fiche(s).`);
if (bilan.aRevoir.length) {
  console.log(
    `À revoir : ${bilan.aRevoir.length} fiche(s), notées pour Claude dans sources-local/verification/a-revoir.md.`,
  );
}
if (bilan.perimees.length) {
  console.log(
    `Modifiées depuis ton choix, à refaire sur la page : ${bilan.perimees.map((f) => f.titre).join(' ; ')}.`,
  );
}
for (const lot of bilan.lotsIncomplets) {
  console.log(
    `Carte (${lot === 'zones' ? 'zones' : 'désignations'}) : enregistrée quand toutes ses fiches seront conformes.`,
  );
}
console.log(`Reste à faire : ${restantes} fiche(s). La page est à jour : recharge-la.`);
