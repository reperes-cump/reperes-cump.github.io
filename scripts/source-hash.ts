/**
 * Calcule l'empreinte SHA-256 d'un fichier de source (PDF gardé dans sources-local/).
 *
 *   npm run source:hash -- sources-local/reco_cump2017.pdf
 */
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';

const fichiers = process.argv.slice(2);
if (!fichiers.length) {
  console.error('Indiquer un fichier : npm run source:hash -- sources-local/document.pdf');
  process.exit(1);
}

for (const fichier of fichiers) {
  const empreinte = createHash('sha256');
  for await (const morceau of createReadStream(fichier)) empreinte.update(morceau);
  console.log(`${empreinte.digest('hex')}  ${fichier}`);
}
