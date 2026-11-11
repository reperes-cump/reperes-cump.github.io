import { z } from 'zod';
import { date, identifiant } from './commun.ts';
import { designations } from './source.ts';

/** Format d'un code de département (métropole, Corse, DROM). L'existence est vérifiée avec le COG. */
export const codeDepartement = z
  .string()
  .regex(/^(0[1-9]|1\d|2[1-9]|[3-8]\d|9[0-5]|2A|2B|97[1-6])$/, 'code de département invalide');

const entreeSchema = z.strictObject({
  /** Région, collectivité ou zone, tel qu'écrit dans le texte. */
  territoire: z.string().min(1),
  /** Établissement, tel qu'écrit dans le texte. */
  etablissement: z.string().min(1),
  departement: codeDepartement,
  /** Vrai quand le texte ne donne pas le département et qu'il a été déduit de la commune. */
  departement_deduit: z.boolean(),
});

export const designationsSchema = z
  .strictObject({
    source_id: identifiant,
    releve_le: date.nullable().default(null),
    verifie_le: date.nullable().default(null),
    verifie_par: z.string().min(1).nullable().default(null),
    annexes: z
      .array(
        z.strictObject({
          annexe: z.string().min(1),
          designation: z.enum(designations),
          entrees: z.array(entreeSchema).min(1),
        }),
      )
      .min(1),
  })
  .superRefine((d, ctx) => {
    if (Boolean(d.verifie_le) !== Boolean(d.verifie_par)) {
      ctx.addIssue({
        code: 'custom',
        path: ['verifie_par'],
        message: '« verifie_le » et « verifie_par » vont ensemble',
      });
    }
  });

export type Designations = z.output<typeof designationsSchema>;

const codeRegion = z.string().regex(/^\d{2}$/, 'code de région invalide');

/** Départements et régions du Code officiel géographique (COG) de l'INSEE. */
export const departementsSchema = z.strictObject({
  source_id: identifiant,
  millesime: z.string().regex(/^\d{4}$/, 'millésime attendu sous la forme AAAA'),
  regions: z.array(z.strictObject({ code: codeRegion, nom: z.string().min(1) })).min(1),
  departements: z
    .array(z.strictObject({ code: codeDepartement, nom: z.string().min(1), region: codeRegion }))
    .min(1),
});

/** Composition des zones de défense et de sécurité, telle qu'écrite dans le code de la défense. */
export const zonesSchema = z
  .strictObject({
    source_id: identifiant,
    verifie_le: date.nullable().default(null),
    verifie_par: z.string().min(1).nullable().default(null),
    zones: z
      .array(
        z.strictObject({
          id: identifiant,
          nom: z.string().min(1),
          siege: z.string().min(1),
          article: z.string().min(1),
          /** Départements, nommés comme dans le texte. */
          departements: z.array(z.string().min(1)).min(1),
          /** Autres territoires de la zone, hors du périmètre de la carte. */
          autres_territoires: z.array(z.string().min(1)).default([]),
        }),
      )
      .min(1),
  })
  .superRefine((z0, ctx) => {
    if (Boolean(z0.verifie_le) !== Boolean(z0.verifie_par)) {
      ctx.addIssue({
        code: 'custom',
        path: ['verifie_par'],
        message: '« verifie_le » et « verifie_par » vont ensemble',
      });
    }
  });

export type Referentiel = z.output<typeof departementsSchema>;
export type Zones = z.output<typeof zonesSchema>;
