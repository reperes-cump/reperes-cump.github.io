import { describe, expect, it } from 'vitest';
import { celluleCsv, donneesOuvertes, versCsv } from '../../scripts/lib/export.ts';
import { affirmation, contenu } from './fabrique.ts';

describe('export des données ouvertes', () => {
  it('échappe les virgules, guillemets et retours à la ligne', () => {
    expect(celluleCsv('simple')).toBe('simple');
    expect(celluleCsv('a, b')).toBe('"a, b"');
    expect(celluleCsv('dit « oui » et "non"')).toBe('"dit « oui » et ""non"""');
    expect(celluleCsv(null)).toBe('');
  });

  it('produit une ligne par élément, plus l’en-tête', () => {
    expect(versCsv(['a', 'b'], [[1, 2]])).toBe('a,b\r\n1,2\r\n');
  });

  it('publie la licence avec chaque fichier JSON', () => {
    const a = affirmation();
    const fichiers = donneesOuvertes(contenu({ affirmations: new Map([[a.id, a]]) }));
    const json = JSON.parse(fichiers['affirmations.json'] ?? '{}');
    expect(json.licence).toBe('CC BY 4.0');
    expect(json.affirmations).toHaveLength(1);
    expect(Object.keys(fichiers)).toEqual([
      'affirmations.json',
      'sources.json',
      'affirmations.csv',
      'sources.csv',
      'LICENCE.txt',
    ]);
  });
});
