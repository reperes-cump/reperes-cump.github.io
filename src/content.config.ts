import { defineCollection } from 'astro:content';
import type { Loader } from 'astro/loaders';
import { affirmationSchema, sourceSchema } from '../schemas/index.ts';
import { lireDossier } from '../scripts/lib/lecture.ts';

/**
 * Chargeur commun : lit les YAML de content/ avec la même fonction que le script de validation,
 * puis laisse Astro valider chaque fichier avec le schéma de la collection.
 */
function dossierYaml(dossier: string): Loader {
  return {
    name: `reperes-cump:${dossier}`,
    load: async ({ store, parseData, config }) => {
      const racine = new URL('.', config.root).pathname;
      const { fichiers } = await lireDossier(racine, dossier);
      store.clear();
      for (const fichier of fichiers) {
        if (fichier.erreurs.length)
          throw new Error(`${fichier.chemin} : ${fichier.erreurs.join(' ; ')}`);
        const data = await parseData({
          id: fichier.nom,
          data: fichier.donnees as Record<string, unknown>,
        });
        store.set({ id: fichier.nom, data });
      }
    },
  };
}

export const collections = {
  sources: defineCollection({ loader: dossierYaml('content/sources'), schema: sourceSchema }),
  affirmations: defineCollection({
    loader: dossierYaml('content/affirmations'),
    schema: affirmationSchema,
  }),
};
