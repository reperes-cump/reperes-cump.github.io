import { z } from 'zod';
import { aRelever, date, identifiant, signale } from './commun.ts';

export const valeurs = [
  'recommande',
  'deconseille',
  'pas_de_consensus',
  'pas_de_conclusion',
  'silence',
  'information',
] as const;

export const grades = ['accord_fort', 'accord_relatif'] as const;

export const categories = [
  'cadre',
  'circuit',
  'matrice',
  'delais',
  'montee',
  'silence',
  'glossaire',
  'methode',
] as const;

export const colonnes = ['alerte', 'activation'] as const;

export const verdictSchema = z.strictObject({
  valeur: z.enum(valeurs),
  grade: z.enum(grades).nullable().default(null),
  /** Libellé propre à la source, quand il remplace celui du verdict. */
  libelle: z.string().min(1).nullable().default(null),
});

export const localisationSchema = z.strictObject({
  article: z.string().min(1).nullable().default(null),
  annexe: z.string().min(1).nullable().default(null),
  section: z.string().min(1).nullable().default(null),
  page: z.number().int().positive().nullable().default(null),
});

export const referenceSourceSchema = z.strictObject({
  source_id: identifiant,
  /** Matrice : colonne à laquelle se rapporte cette référence. */
  porte_sur: z.enum(colonnes).nullable().default(null),
  localisation: localisationSchema.prefault({}),
  lien_profond: z
    .url({ protocol: /^https$/ })
    .nullable()
    .default(null),
  extrait: z.string().min(1).nullable().default(null),
});

const absent = (ctx: z.RefinementCtx, champ: string, raison: string) =>
  ctx.addIssue({ code: 'custom', path: [champ], message: raison });

export const affirmationSchema = z
  .strictObject({
    id: identifiant,
    categorie: z.enum(categories),
    ordre: z.number().int().nonnegative().nullable().default(null),
    enonce: z.string().min(1).nullable().default(null),
    situation: z.string().min(1).nullable().default(null),
    verdict: verdictSchema.nullable().default(null),
    verdicts: z
      .strictObject({ alerte: verdictSchema, activation: verdictSchema })
      .nullable()
      .default(null),
    /** Matrice : une seule cellule couvre les deux colonnes. */
    fusion: verdictSchema.nullable().default(null),
    sources: z
      .array(referenceSourceSchema)
      .min(1, 'une affirmation doit citer au moins une source'),
    critere_explorateur: identifiant.nullable().default(null),
    note_publique: z.string().min(1).nullable().default(null),
    a_relever: aRelever,
    verifie_le: date.nullable().default(null),
    verifie_par: z.string().min(1).nullable().default(null),
  })
  .superRefine((a, ctx) => {
    if (a.categorie === 'matrice') {
      if (!a.situation) absent(ctx, 'situation', 'une ligne de matrice doit avoir une situation');
      if (a.enonce)
        absent(ctx, 'enonce', 'une ligne de matrice utilise « situation », pas « enonce »');
      if (a.verdict)
        absent(ctx, 'verdict', 'une ligne de matrice utilise « verdicts » ou « fusion »');
      if (Boolean(a.verdicts) === Boolean(a.fusion)) {
        absent(ctx, 'verdicts', 'une ligne de matrice a soit « verdicts », soit « fusion »');
      }
      if (!a.critere_explorateur) {
        absent(
          ctx,
          'critere_explorateur',
          'une ligne de matrice doit avoir un critère d’explorateur',
        );
      }
      a.sources.forEach((reference, index) => {
        if (a.verdicts && !reference.porte_sur) {
          absent(
            ctx,
            'sources',
            `source ${index + 1} : préciser « porte_sur » (alerte ou activation)`,
          );
        }
        if (a.fusion && reference.porte_sur) {
          absent(
            ctx,
            'sources',
            `source ${index + 1} : « porte_sur » est inutile pour une cellule fusionnée`,
          );
        }
      });
      if (a.verdicts) {
        for (const colonne of colonnes) {
          if (!a.sources.some((reference) => reference.porte_sur === colonne)) {
            absent(ctx, 'sources', `aucune source pour la colonne « ${colonne} »`);
          }
        }
      }
    } else {
      if (!a.enonce) absent(ctx, 'enonce', 'une affirmation doit avoir un énoncé');
      if (!a.verdict) absent(ctx, 'verdict', 'une affirmation doit avoir un verdict');
      if (a.situation) absent(ctx, 'situation', 'réservé aux lignes de matrice');
      if (a.verdicts) absent(ctx, 'verdicts', 'réservé aux lignes de matrice');
      if (a.fusion) absent(ctx, 'fusion', 'réservé aux lignes de matrice');
      if (a.critere_explorateur)
        absent(ctx, 'critere_explorateur', 'réservé aux lignes de matrice');
      if (a.sources.some((reference) => reference.porte_sur)) {
        absent(ctx, 'sources', '« porte_sur » est réservé aux lignes de matrice');
      }
    }

    const verdicts = [a.verdict, a.fusion, a.verdicts?.alerte, a.verdicts?.activation];
    const silence = verdicts.some((verdict) => verdict?.valeur === 'silence');
    if (silence && !a.note_publique && !signale(a.a_relever, 'note publique')) {
      absent(ctx, 'note_publique', 'un silence des textes doit dire ce qui manque (note_publique)');
    }

    if (Boolean(a.verifie_le) !== Boolean(a.verifie_par)) {
      absent(ctx, 'verifie_par', '« verifie_le » et « verifie_par » vont ensemble');
    }
  });

export type Verdict = z.output<typeof verdictSchema>;
export type Affirmation = z.output<typeof affirmationSchema>;
