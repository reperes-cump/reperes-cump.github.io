/**
 * Écrit le jeu de données ouvert (JSON, CSV, licence).
 * Le build le fait automatiquement dans dist/donnees/.
 *
 *   npm run export -- [dossier]     (par défaut : dist/donnees)
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { chargerContenu } from './lib/contenu.ts';
import { donneesOuvertes } from './lib/export.ts';

const racine = new URL('..', import.meta.url).pathname;
const dossier = resolve(process.argv[2] ?? join(racine, 'dist/donnees'));

const { contenu, erreurs } = await chargerContenu(racine);
if (erreurs.length) {
  console.error('Contenu invalide : lancer npm run validate pour le détail.');
  process.exit(1);
}

await mkdir(dossier, { recursive: true });
for (const [nom, texte] of Object.entries(donneesOuvertes(contenu))) {
  await writeFile(join(dossier, nom), texte, 'utf8');
}
console.log(`Données ouvertes écrites dans ${dossier}`);
