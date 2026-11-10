import { z } from 'zod';
import { aRelever, date, datePartielle, identifiant } from './commun.ts';

export const typesSource = [
  'code',
  'decret',
  'arrete',
  'instruction',
  'recommandation',
  'page_institutionnelle',
  'jeu_de_donnees',
] as const;

export const autorites = [
  'reglementaire',
  'recommandation_pro',
  'information_institutionnelle',
  'donnees_publiques',
] as const;

export const statutsSource = ['en_vigueur', 'abroge', 'modifie', 'a_verifier'] as const;

export const reutilisations = ['texte_officiel', 'courte_citation', 'licence_ouverte'] as const;

export const designations = ['regionale', 'renforcee', 'zonale'] as const;

/** Annexe d'un texte qui liste des désignations de CUMP, avec leur nombre relevé dans le texte. */
const annexeSchema = z.strictObject({
  numero: z.string().min(1),
  intitule: z.string().min(1),
  designation: z.enum(designations),
  nombre: z.number().int().nonnegative(),
});

export const sourceSchema = z
  .strictObject({
    id: identifiant,
    titre: z.string().min(1),
    libelle_court: z.string().min(1),
    type: z.enum(typesSource),
    autorite: z.enum(autorites),
    auteurs: z.string().min(1).nullable().default(null),
    editeur: z.string().min(1).nullable().default(null),
    revue: z.string().min(1).nullable().default(null),
    reference: z.string().min(1).nullable().default(null),
    doi: z.string().min(1).nullable().default(null),
    date_publication: datePartielle.nullable().default(null),
    statut: z.enum(statutsSource),
    abroge_ou_modifie_par: z.string().min(1).nullable().default(null),
    url: z
      .url({ protocol: /^https$/ })
      .nullable()
      .default(null),
    url_archive: z
      .url({ protocol: /^https$/ })
      .nullable()
      .default(null),
    sha256: z
      .string()
      .regex(/^[a-f0-9]{64}$/, 'empreinte SHA-256 attendue (64 caractères hexadécimaux)')
      .nullable()
      .default(null),
    consulte_le: date.nullable().default(null),
    reutilisation: z.enum(reutilisations).nullable().default(null),
    annexes: z.array(annexeSchema).default([]),
    note_publique: z.string().min(1).nullable().default(null),
    a_relever: aRelever,
  })
  .superRefine((source, ctx) => {
    if (
      (source.statut === 'abroge' || source.statut === 'modifie') &&
      !source.abroge_ou_modifie_par
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['abroge_ou_modifie_par'],
        message: 'un texte abrogé ou modifié doit indiquer le texte qui l’abroge ou le modifie',
      });
    }
  });

export type Source = z.output<typeof sourceSchema>;
