import { z } from 'zod';
import { date } from './commun.ts';

/** Informations générales sur le contenu : version, date de vérification, mainteneur. */
export const contenuSchema = z.strictObject({
  version: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/, 'version attendue sous la forme 1.2.0')
    .nullable()
    .default(null),
  derniere_verification: date.nullable().default(null),
  /** Identifiant GitHub du mainteneur : seule valeur acceptée pour « verifie_par » en publication. */
  mainteneur: z.string().min(1),
});

export type InfosContenu = z.output<typeof contenuSchema>;
