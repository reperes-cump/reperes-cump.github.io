/**
 * Valide le contenu (dossier content/).
 *
 *   npm run validate             contrôle la structure et la cohérence (brouillon)
 *   PUBLISH=1 npm run validate   exige en plus que tout soit vérifié (publication)
 *   npm run a-relever            liste tout ce qui reste à relever ou à vérifier
 */
import { chargerContenu, parFichier } from './lib/contenu.ts';
import type { Probleme } from './lib/types.ts';

const racine = new URL('..', import.meta.url).pathname;
const publication = process.env.PUBLISH === '1';
const detailARelever = process.argv.includes('--a-relever');

const { contenu, erreurs, avertissements, aRelever } = await chargerContenu(racine, {
  publication,
});

const afficher = (problemes: Probleme[]) => {
  for (const [fichier, messages] of parFichier(problemes)) {
    console.log(`  ${fichier}`);
    for (const message of messages) console.log(`    - ${message}`);
  }
};
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`;

if (detailARelever) {
  console.log(`Reste à relever ou à vérifier (${pluriel(aRelever.length, 'fichier')}) :\n`);
  afficher(aRelever);
  process.exit(0);
}

const mode = publication ? 'publication' : 'brouillon';
if (erreurs.length) {
  console.error(`Contenu invalide (${mode}) : ${pluriel(erreurs.length, 'erreur')}.\n`);
  afficher(erreurs);
  process.exitCode = 1;
} else {
  const designations =
    contenu.designations?.annexes.reduce((total, annexe) => total + annexe.entrees.length, 0) ?? 0;
  console.log(
    `Contenu valide (${mode}) : ${pluriel(contenu.sources.size, 'source')}, ` +
      `${pluriel(contenu.affirmations.size, 'affirmation')}, ` +
      `${pluriel(contenu.visuels.size + (contenu.glossaire ? 1 : 0), 'visuel')}, ` +
      `${pluriel(designations, 'désignation')}.`,
  );
}

if (avertissements.length) {
  console.log(`\n${pluriel(avertissements.length, 'avertissement')} :`);
  afficher(avertissements);
}

if (!publication && aRelever.length) {
  console.log(
    `\nReste à relever ou à vérifier dans ${pluriel(aRelever.length, 'fichier')}. Détail : npm run a-relever`,
  );
}
