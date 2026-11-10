import { affirmationSchema, contenuSchema, sourceSchema } from '../../schemas/index.ts';
import type { Contenu } from '../../scripts/lib/types.ts';

/** Source minimale valide, surchargée au besoin. */
export const source = (surcharge: Record<string, unknown> = {}) =>
  sourceSchema.parse({
    id: 'reco',
    titre: 'Recommandation de test',
    libelle_court: 'Reco',
    type: 'recommandation',
    autorite: 'recommandation_pro',
    statut: 'en_vigueur',
    ...surcharge,
  });

/** Affirmation minimale valide (hors matrice), surchargée au besoin. */
export const affirmation = (surcharge: Record<string, unknown> = {}) =>
  affirmationSchema.parse({
    id: 'exemple',
    categorie: 'cadre',
    enonce: 'Énoncé de test.',
    verdict: { valeur: 'information' },
    sources: [{ source_id: 'reco', localisation: { page: 3 } }],
    ...surcharge,
  });

/** Contenu en mémoire, assemblé à partir d'éléments déjà validés. */
export const contenu = (morceaux: Partial<Contenu> = {}): Contenu => ({
  infos: contenuSchema.parse({ mainteneur: 'mainteneur' }),
  sources: new Map([['reco', source()]]),
  affirmations: new Map(),
  visuels: new Map(),
  glossaire: null,
  designations: null,
  departements: null,
  ...morceaux,
});
