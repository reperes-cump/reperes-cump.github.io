import type { Affirmation } from '../../schemas/index.ts';

/** Endroit du site où une information est affichée. */
export interface Emplacement {
  /** Chemin de la page, relatif à la racine du site (ex. « » pour l'accueil). */
  page: string;
  ancre: string;
}

export interface Citation {
  affirmation: Affirmation;
  /** Texte court qui désigne l'information : situation ou énoncé (premier paragraphe). */
  texte: string;
  emplacement: Emplacement | null;
}

const premierParagraphe = (texte: string) => texte.split(/\n\s*\n/)[0]?.trim() ?? texte;

/**
 * Pour chaque source, les informations qui la citent, dans l'ordre de catégorie puis d'affichage.
 * Une information qui cite plusieurs fois la même source n'apparaît qu'une fois.
 */
export function citationsParSource(
  affirmations: Iterable<Affirmation>,
  emplacements: Map<string, Emplacement>,
  ordreCategories: readonly string[],
): Map<string, Citation[]> {
  const rang = (a: Affirmation) => {
    const position = ordreCategories.indexOf(a.categorie);
    return position === -1 ? ordreCategories.length : position;
  };
  const triees = [...affirmations].sort(
    (a, b) => rang(a) - rang(b) || (a.ordre ?? 0) - (b.ordre ?? 0) || a.id.localeCompare(b.id),
  );
  const citations = new Map<string, Citation[]>();
  for (const affirmation of triees) {
    const citation: Citation = {
      affirmation,
      texte: premierParagraphe(affirmation.situation ?? affirmation.enonce ?? affirmation.id),
      emplacement: emplacements.get(affirmation.id) ?? null,
    };
    for (const sourceId of new Set(affirmation.sources.map((r) => r.source_id))) {
      citations.set(sourceId, [...(citations.get(sourceId) ?? []), citation]);
    }
  }
  return citations;
}
