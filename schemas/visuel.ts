import { z } from 'zod';
import { aRelever, identifiant } from './commun.ts';

const elementSchema = z.strictObject({
  id: identifiant,
  type: z.enum(['etape', 'branche', 'issue', 'niveau', 'periode']).nullable().default(null),
  libelle: z.string().min(1).nullable().default(null),
  /** Affirmations affichées par cet élément (au moins une : aucun texte libre). */
  affirmations: z.array(identifiant).min(1),
  /** Élément affiché en note d'un autre (ex. le suppléant, à côté du référent). */
  rattache_a: identifiant.nullable().default(null),
  /** Élément qui vient après une issue (ex. l'intervention, après l'activation). */
  apres: identifiant.nullable().default(null),
});

/**
 * Un chemin du circuit : un point de départ, les étapes dans l'ordre, les issues possibles,
 * puis ce qui suit une issue (ex. l'intervention après l'activation).
 */
const cheminSchema = z.strictObject({
  id: identifiant,
  libelle: z.string().min(1),
  etapes: z.array(identifiant).min(1),
  issues: z.array(identifiant).default([]),
  suites: z.array(identifiant).default([]),
});

/** Circuit, frise ou pyramide : une suite ordonnée d'éléments sourcés. */
export const visuelSchema = z.strictObject({
  elements: z.array(elementSchema).min(1),
  definitions: z.array(identifiant).default([]),
  /** Circuit seulement : comment les éléments s'enchaînent, selon le point de départ. */
  chemins: z.array(cheminSchema).default([]),
});

export const glossaireSchema = z.strictObject({
  termes: z
    .array(
      z.strictObject({
        id: identifiant,
        terme: z.string().min(1),
        /** Affirmation qui donne la définition, ou null si elle reste à trouver. */
        definition: identifiant.nullable().default(null),
        a_relever: aRelever,
      }),
    )
    .min(1),
});

export type Visuel = z.output<typeof visuelSchema>;
export type Glossaire = z.output<typeof glossaireSchema>;
