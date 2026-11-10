import { z } from 'zod';

/** Documents volontairement écartés, affichés sur la page Sources. */
export const exclusionsSchema = z.strictObject({
  exclusions: z
    .array(
      z.strictObject({
        document: z.string().min(1),
        raison: z.string().min(1),
      }),
    )
    .min(1),
});

/** En-tête d'une page rédigée en Markdown. */
export const pageSchema = z.strictObject({
  titre: z.string().min(1),
  description: z.string().min(1),
});

export type Exclusions = z.output<typeof exclusionsSchema>;
