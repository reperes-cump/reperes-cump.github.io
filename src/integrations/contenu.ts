import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import { chargerContenu, parFichier } from '../../scripts/lib/contenu.ts';
import { donneesOuvertes } from '../../scripts/lib/export.ts';

/**
 * Valide tout le contenu avant le build (le build échoue au moindre problème)
 * et publie le jeu de données ouvert dans /donnees/ après le build.
 * Avec PUBLISH=1, tout doit être vérifié.
 */
export default function contenu(): AstroIntegration {
  let racine = '';
  return {
    name: 'reperes-cump:contenu',
    hooks: {
      'astro:config:done': ({ config }) => {
        racine = fileURLToPath(config.root);
      },
      'astro:build:start': async ({ logger }) => {
        const publication = process.env.PUBLISH === '1';
        const { erreurs } = await chargerContenu(racine, { publication });
        if (erreurs.length) {
          for (const [fichier, messages] of parFichier(erreurs)) {
            logger.error(`${fichier}\n  - ${messages.join('\n  - ')}`);
          }
          throw new Error(
            `Contenu invalide (${publication ? 'publication' : 'brouillon'}) : ${erreurs.length} erreur(s).`,
          );
        }
        logger.info(`Contenu valide (${publication ? 'publication' : 'brouillon'}).`);
      },
      'astro:build:done': async ({ dir, logger }) => {
        const { contenu } = await chargerContenu(racine);
        const dossier = new URL('donnees/', dir);
        await mkdir(dossier, { recursive: true });
        for (const [nom, texte] of Object.entries(donneesOuvertes(contenu))) {
          await writeFile(new URL(nom, dossier), texte, 'utf8');
        }
        logger.info('Données ouvertes publiées dans /donnees/.');
      },
    },
  };
}
