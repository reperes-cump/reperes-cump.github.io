import { getCollection, getEntry } from 'astro:content';
import type { Topology } from 'topojson-specification';
import topologie from '../../content/geo/departements.topo.json';
import type { Affirmation } from '../../schemas/index.ts';
import { lignesMatrice } from './affichage.ts';
import { calculerCarte } from './carte.ts';
import { preparerCircuit } from './circuit.ts';
import type { Emplacement } from './citations.ts';

/** Toutes les données du contenu, lues une fois par build. */
async function lire() {
  const sources = new Map((await getCollection('sources')).map((e) => [e.id, e.data]));
  const affirmations = new Map((await getCollection('affirmations')).map((e) => [e.id, e.data]));
  const infos = (await getEntry('infos', 'contenu'))?.data ?? null;
  const encadre = (await getEntry('visuels', 'encadre-silence'))?.data ?? null;
  const circuit = (await getEntry('visuels', 'circuit'))?.data ?? null;
  const designations = (await getEntry('designations', 'designations'))?.data ?? null;
  const referentiel = (await getEntry('referentiel', 'departements'))?.data ?? null;
  const zones = (await getEntry('zones', 'zones'))?.data ?? null;
  return { sources, affirmations, infos, encadre, circuit, designations, referentiel, zones };
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
  const cadre = [
    { libelle: 'Qui décide', affirmation: requise('cadre-declenchement') },
    { libelle: 'Sur quels critères', affirmation: requise('cadre-indication') },
    { libelle: 'Quelles situations', affirmation: requise('cadre-schema-type') },
  ].map((element) => ({
    ...element,
    // Pour le schéma type, le site affiche la note publique : le schéma local n'est pas repris.
    texte: element.affirmation.note_publique ?? element.affirmation.enonce ?? '',
  }));
  const voirAussi = lignes.flatMap((ligne) =>
    ligne.voir_aussi.map((id) => ({ ligne, affirmation: requise(id) })),
  );
  const demande = requise('circuit-demande-samu');
  const grades = requise('methode-grades');
  const elementsEncadre = (encadre?.elements ?? []).flatMap((e) => e.affirmations.map(requise));

  const emplacements = new Map<string, Emplacement>();
  for (const ligne of lignes) {
    emplacements.set(ligne.id, { page: '', ancre: `situation-${ligne.critere_explorateur}` });
  }
  for (const { ligne, affirmation } of voirAussi) {
    emplacements.set(affirmation.id, { page: '', ancre: `situation-${ligne.critere_explorateur}` });
  }
  for (const { affirmation } of cadre) {
    emplacements.set(affirmation.id, { page: '', ancre: 'cadre-officiel' });
  }
  emplacements.set(demande.id, { page: '', ancre: 'demande-samu' });
  emplacements.set(grades.id, { page: '', ancre: 'lecture-des-grades' });
  for (const element of elementsEncadre) {
    emplacements.set(element.id, { page: '', ancre: 'ce-que-les-textes-ne-disent-pas' });
  }

  const affichees = [
    ...cadre.map((c) => c.affirmation),
    ...lignes,
    ...voirAussi.map((v) => v.affirmation),
    demande,
    grades,
    ...elementsEncadre,
  ];
  return { cadre, lignes, demande, grades, elementsEncadre, affichees, emplacements };
}

/** Ce que la page Circuit affiche, et l'ancre de chaque information. */
export async function pageCircuit() {
  const { affirmations, circuit } = await donnees();
  if (!circuit) throw new Error('Circuit : content/visuels/circuit.yaml introuvable');
  const requise = (id: string): Affirmation => {
    const affirmation = affirmations.get(id);
    if (!affirmation) throw new Error(`Circuit : affirmation introuvable : ${id}`);
    return affirmation;
  };
  const prepare = preparerCircuit(circuit, requise);
  const definitions = circuit.definitions.map(requise);

  const emplacements = new Map<string, Emplacement>();
  for (const element of circuit.elements) {
    const ancre = `etape-${element.rattache_a ?? element.id}`;
    for (const id of element.affirmations) emplacements.set(id, { page: 'circuit', ancre });
  }
  for (const d of definitions) emplacements.set(d.id, { page: 'circuit', ancre: 'deux-mots' });

  const affichees = [
    ...circuit.elements.flatMap((e) => e.affirmations.map(requise)),
    ...definitions,
  ];
  const renvois = affichees.flatMap((a) => a.voir_aussi.map(requise));
  return { circuit: prepare, definitions, emplacements, affichees: [...affichees, ...renvois] };
}

/** Ce que la page Carte affiche. */
export async function pageCarte() {
  const { affirmations, designations, referentiel, zones } = await donnees();
  if (!designations || !referentiel)
    throw new Error('Carte : désignations ou départements introuvables');
  const regle = affirmations.get('cadre-cump-departementale');
  if (!regle) throw new Error('Carte : affirmation introuvable : cadre-cump-departementale');
  const carte = calculerCarte(topologie as unknown as Topology, referentiel, zones, designations);
  const emplacements = new Map<string, Emplacement>([
    [regle.id, { page: 'carte', ancre: 'regle-generale' }],
  ]);
  return { carte, designations, referentiel, zones, regle, emplacements };
}
