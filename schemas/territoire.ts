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
