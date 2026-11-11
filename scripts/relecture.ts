/**
 * Prépare la page de vérification du mainteneur : sources-local/relecture.html.
 * Ce dossier n'est pas suivi par Git ; le script n'écrit rien dans content/.
 *
 *   npm run relecture
 *
 * Les PDF des textes sont lus dans sources-local/ (par exemple sources-local/textes/<id>.pdf) ;
 * les propositions de relevé, dans sources-local/verification/propositions.yaml.
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pageDeVerification } from './lib/relecture.ts';
import { chargerVerification, DOSSIER_LOCAL } from './lib/textes-locaux.ts';

const racine = process.cwd();
let verification: Awaited<ReturnType<typeof chargerVerification>>;
try {
  verification = await chargerVerification(racine);
} catch (erreur) {
  console.error(`Impossible de préparer la vérification : ${(erreur as Error).message}`);
  process.exit(1);
}

const { contenu, fiches, groupes, textes } = verification;
const sortie = path.join(racine, DOSSIER_LOCAL, 'relecture.html');
await writeFile(
  sortie,
  pageDeVerification(fiches, groupes, {
    date: new Date().toISOString().slice(0, 10),
    mainteneur: contenu.infos?.mainteneur ?? 'le mainteneur',
  }),
);

const faites = fiches.filter((f) => f.deja).length;
const pretes = fiches.filter((f) => !f.deja && f.pret).length;
const attente = fiches.filter((f) => !f.deja && !f.pret);
console.log(`Page de vérification : ${path.relative(racine, sortie)}`);
console.log(`${pretes} fiche(s) prête(s) à vérifier, ${faites} déjà vérifiée(s).`);
console.log(`Textes lus sur ton poste : ${[...textes.keys()].join(', ') || 'aucun'}.`);
if (attente.length) {
  console.log(`${attente.length} fiche(s) en attente :`);
  for (const f of attente) console.log(`  - ${f.titre.slice(0, 70)} : ${f.attente}`);
}
