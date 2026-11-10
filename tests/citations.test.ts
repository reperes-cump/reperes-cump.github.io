import { describe, expect, it } from 'vitest';
import { datePublication, etatContenu, nombre } from '../src/lib/affichage.ts';
import { citationsParSource } from '../src/lib/citations.ts';
import { affirmation } from './donnees/fabrique.ts';

describe('index des citations', () => {
  const a = affirmation({ id: 'a', categorie: 'cadre', ordre: 20, enonce: 'Premier.\n\nSuite.' });
  const b = affirmation({
    id: 'b',
    categorie: 'cadre',
    ordre: 10,
    sources: [{ source_id: 'reco' }, { source_id: 'reco' }, { source_id: 'loi' }],
  });

  it('regroupe les informations par source, une seule fois chacune, dans l’ordre', () => {
    const index = citationsParSource([a, b], new Map(), ['cadre']);
    expect(index.get('reco')?.map((c) => c.affirmation.id)).toEqual(['b', 'a']);
    expect(index.get('loi')?.map((c) => c.affirmation.id)).toEqual(['b']);
  });

  it('garde le premier paragraphe et l’endroit où l’information est affichée', () => {
    const emplacements = new Map([['a', { page: '', ancre: 'situation-a' }]]);
    const [citation] = citationsParSource([a], emplacements, ['cadre']).get('reco') ?? [];
    expect(citation?.texte).toBe('Premier.');
    expect(citation?.emplacement).toEqual({ page: '', ancre: 'situation-a' });
  });
});

describe('textes d’état', () => {
  it('écrit les dates de publication partielles', () => {
    expect(datePublication('2017')).toBe('2017');
    expect(datePublication('2013-01')).toBe('janvier 2013');
    expect(datePublication('2013-01-07')).toBe('7 janvier 2013');
  });

  it('décrit l’état du contenu', () => {
    expect(etatContenu(null)).toBe('Contenu en brouillon, pas encore vérifié.');
    expect(
      etatContenu({ version: '1.0.0', derniere_verification: '2026-12-03', mainteneur: 'm' }),
    ).toBe('Version 1.0.0 du contenu, vérifiée le 3 décembre 2026.');
  });

  it('accorde en nombre', () => {
    expect(nombre(1, 'information')).toBe('1 information');
    expect(nombre(38, 'information')).toBe('38 informations');
  });
});
