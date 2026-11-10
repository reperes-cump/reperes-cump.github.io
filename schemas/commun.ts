import { z } from 'zod';

/** Identifiant de fichier : minuscules, chiffres et tirets. */
export const identifiant = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'identifiant attendu en minuscules, chiffres et tirets');

/** Accepte une date écrite sans guillemets dans le YAML (objet Date ou nombre). */
const versTexte = (valeur: unknown) => {
  if (valeur instanceof Date) return valeur.toISOString().slice(0, 10);
  if (typeof valeur === 'number') return String(valeur);
  return valeur;
};

/** Date complète, au format AAAA-MM-JJ. */
export const date = z.preprocess(versTexte, z.iso.date());

/** Date complète ou partielle : AAAA, AAAA-MM ou AAAA-MM-JJ. */
export const datePartielle = z.preprocess(
  versTexte,
  z
    .string()
    .regex(
      /^\d{4}(?:-\d{2}(?:-\d{2})?)?$/,
      'date attendue sous la forme AAAA, AAAA-MM ou AAAA-MM-JJ',
    ),
);

/**
 * Informations signalées comme manquantes, à relever dans la source.
 * Mots reconnus par les contrôles : « grade », « note publique », « définition ».
 * La page ou l'article manquants sont détectés automatiquement.
 */
export const aRelever = z.array(z.string().min(1)).default([]);

/** Une liste « à relever » contient-elle ce mot ? */
export const signale = (liste: readonly string[], mot: string) =>
  liste.some((element) => element.toLowerCase().includes(mot));
