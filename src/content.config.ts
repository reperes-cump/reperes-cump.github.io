import { defineCollection } from 'astro:content';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Loader } from 'astro/loaders';
import { z } from 'zod';
import {
  affirmationSchema,
  contenuSchema,
  designationsSchema,
  exclusionsSchema,
  glossaireSchema,
  pageSchema,
  sourceSchema,
  visuelSchema,
} from '../schemas/index.ts';
import { type FichierYaml, lireDossier, lireMarkdown, lireYaml } from '../scripts/lib/lecture.ts';
import { typographie } from './lib/affichage.ts';

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

/** Page rédigée en Markdown : en-tête validé, corps rendu en HTML au build. */
function pageMarkdown(chemin: string): Loader {
  return {
    name: `reperes-cump:${chemin}`,
    load: async ({ store, parseData, renderMarkdown, config }) => {
      const racine = new URL('.', config.root).pathname;
      const fichier = await lireMarkdown(racine, chemin);
      if (fichier.erreurs.length) throw new Error(`${chemin} : ${fichier.erreurs.join(' ; ')}`);
      const data = await parseData({
        id: fichier.nom,
        data: fichier.donnees as Record<string, unknown>,
      });
      store.clear();
      store.set({
        id: fichier.nom,
        data,
        body: fichier.corps,
        rendered: await renderMarkdown(typographie(fichier.corps)),
      });
    },
  };
}

/**
 * Historique des versions du contenu, lu dans CHANGELOG.md (un seul exemplaire) :
 * sans le titre ni l'introduction du fichier, titres abaissés d'un niveau.
 */
const historique: Loader = {
  name: 'reperes-cump:historique',
  load: async ({ store, renderMarkdown, config }) => {
    const texte = await readFile(join(new URL('.', config.root).pathname, 'CHANGELOG.md'), 'utf8');
    const debut = texte.indexOf('\n## ');
    const corps = (debut === -1 ? '' : texte.slice(debut + 1)).replace(/^## /gm, '### ');
    store.clear();
    store.set({
      id: 'historique',
      data: {},
      body: corps,
      rendered: await renderMarkdown(typographie(corps)),
    });
  },
};

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
  designations: defineCollection({
    loader: fichier('content/territoires/designations.yaml'),
    schema: designationsSchema,
  }),
  exclusions: defineCollection({
    loader: fichier('content/pages/sources-exclues.yaml'),
    schema: exclusionsSchema,
  }),
  pages: defineCollection({
    loader: pageMarkdown('content/pages/a-propos.md'),
    schema: pageSchema,
  }),
  historique: defineCollection({ loader: historique, schema: z.object({}) }),
};
