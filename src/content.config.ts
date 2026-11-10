import { defineCollection } from 'astro:content';
import type { Loader } from 'astro/loaders';
import {
  affirmationSchema,
  contenuSchema,
  glossaireSchema,
  sourceSchema,
  visuelSchema,
} from '../schemas/index.ts';
import { type FichierYaml, lireDossier, lireYaml } from '../scripts/lib/lecture.ts';

/**
 * Chargeurs communs : ils lisent les YAML de content/ avec la même fonction que le script de
 * validation, puis laissent Astro valider chaque fichier avec le schéma de la collection.
 */
function chargeur(nom: string, lire: (racine: string) => Promise<FichierYaml[]>): Loader {
  return {
    name: `reperes-cump:${nom}`,
    load: async ({ store, parseData, config }) => {
      const racine = new URL('.', config.root).pathname;
      store.clear();
      for (const fichier of await lire(racine)) {
        if (fichier.erreurs.length) {
          throw new Error(`${fichier.chemin} : ${fichier.erreurs.join(' ; ')}`);
        }
        const data = await parseData({
          id: fichier.nom,
          data: fichier.donnees as Record<string, unknown>,
        });
        store.set({ id: fichier.nom, data });
      }
    },
  };
}

const dossier = (chemin: string, garder: (nom: string) => boolean = () => true) =>
  chargeur(chemin, async (racine) =>
    (await lireDossier(racine, chemin)).fichiers.filter((f) => garder(f.nom)),
  );

const fichier = (chemin: string) =>
  chargeur(chemin, async (racine) => [await lireYaml(racine, chemin)]);

export const collections = {
  sources: defineCollection({ loader: dossier('content/sources'), schema: sourceSchema }),
  affirmations: defineCollection({
    loader: dossier('content/affirmations'),
    schema: affirmationSchema,
  }),
  visuels: defineCollection({
    loader: dossier('content/visuels', (nom) => nom !== 'glossaire'),
    schema: visuelSchema,
  }),
  glossaire: defineCollection({
    loader: fichier('content/visuels/glossaire.yaml'),
    schema: glossaireSchema,
  }),
  infos: defineCollection({ loader: fichier('content/contenu.yaml'), schema: contenuSchema }),
};
