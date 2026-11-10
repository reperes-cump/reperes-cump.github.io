import { getCollection, getEntry } from 'astro:content';
import type { Affirmation } from '../../schemas/index.ts';
import { lignesMatrice } from './affichage.ts';
import type { Emplacement } from './citations.ts';

/** Toutes les données du contenu, lues une fois par build. */
async function lire() {
  const sources = new Map((await getCollection('sources')).map((e) => [e.id, e.data]));
  const affirmations = new Map((await getCollection('affirmations')).map((e) => [e.id, e.data]));
  const infos = (await getEntry('infos', 'contenu'))?.data ?? null;
  const encadre = (await getEntry('visuels', 'encadre-silence'))?.data ?? null;
  const designations = (await getEntry('designations', 'designations'))?.data ?? null;
  return { sources, affirmations, infos, encadre, designations };
}

let promesse: ReturnType<typeof lire> | null = null;
export const donnees = () => {
  promesse ??= lire();
  return promesse;
};

/** Ce que l'accueil affiche, et l'ancre de chaque information. */
export async function accueil() {
  const { affirmations, encadre } = await donnees();
  const requise = (id: string): Affirmation => {
    const affirmation = affirmations.get(id);
    if (!affirmation) throw new Error(`Accueil : affirmation introuvable : ${id}`);
    return affirmation;
  };

  const lignes = lignesMatrice(affirmations.values());
  const demande = requise('circuit-demande-samu');
  const grades = requise('methode-grades');
  const elementsEncadre = (encadre?.elements ?? []).flatMap((e) => e.affirmations.map(requise));

  const emplacements = new Map<string, Emplacement>();
  for (const ligne of lignes) {
    emplacements.set(ligne.id, { page: '', ancre: `situation-${ligne.critere_explorateur}` });
  }
  emplacements.set(demande.id, { page: '', ancre: 'demande-samu' });
  emplacements.set(grades.id, { page: '', ancre: 'lecture-des-grades' });
  for (const element of elementsEncadre) {
    emplacements.set(element.id, { page: '', ancre: 'ce-que-les-textes-ne-disent-pas' });
  }

  const affichees = [...lignes, demande, grades, ...elementsEncadre];
  return { lignes, demande, grades, elementsEncadre, affichees, emplacements };
}
