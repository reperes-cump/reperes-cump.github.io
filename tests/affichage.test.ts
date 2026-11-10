import { describe, expect, it } from 'vitest';
import {
  dateLisible,
  groupesSources,
  libellePuce,
  lienDirect,
  lignesMatrice,
  paragraphes,
  texteLocalisation,
  typographie,
} from '../src/lib/affichage.ts';
import { affirmation, source } from './donnees/fabrique.ts';

describe('typographie française', () => {
  it('ajoute les espaces insécables sans toucher aux URL', () => {
    expect(typographie('Publics : victimes ; proches ?')).toBe('Publics : victimes ; proches ?');
    expect(typographie('« Pas de consensus »')).toBe('« Pas de consensus »');
    expect(typographie('https://exemple.fr')).toBe('https://exemple.fr');
    expect(typographie('avant 24 h et 24 h/24')).toBe('avant 24\u00a0h et 24\u00a0h/24');
  });
});

describe('paragraphes', () => {
  it('découpe sur les lignes vides', () => {
    expect(paragraphes('Un.\n\nDeux.\n\n')).toEqual(['Un.', 'Deux.']);
  });
});

describe('puces de source', () => {
  it('affiche la seule source tant que rien n’est relevé', () => {
    const a = affirmation({ sources: [{ source_id: 'reco' }] });
    expect(libellePuce(source(), a.sources)).toBe('Reco');
  });

  it('ajoute la page ou l’article relevés', () => {
    const a = affirmation({
      sources: [
        { source_id: 'reco', localisation: { article: 'R6311-26' } },
        { source_id: 'reco', localisation: { article: 'R6311-27' } },
      ],
    });
    expect(libellePuce(source(), a.sources)).toBe('Reco, art. R6311-26, R6311-27');
    const b = affirmation({ sources: [{ source_id: 'reco', localisation: { page: 6 } }] });
    expect(libellePuce(source(), b.sources)).toBe('Reco, p. 6');
  });

  it('regroupe les références par source et par colonne', () => {
    const a = affirmation({
      categorie: 'matrice',
      enonce: null,
      verdict: null,
      situation: 'S',
      critere_explorateur: 's',
      verdicts: {
        alerte: { valeur: 'pas_de_consensus' },
        activation: { valeur: 'pas_de_consensus' },
      },
      sources: [
        { source_id: 'reco', porte_sur: 'alerte' },
        { source_id: 'reco', porte_sur: 'activation' },
      ],
    });
    expect(groupesSources(a, 'alerte')).toHaveLength(1);
    expect(groupesSources(a, 'alerte')[0]?.references).toHaveLength(1);
    expect(groupesSources(a)[0]?.references).toHaveLength(2);
  });
});

describe('localisation et liens', () => {
  it('écrit la localisation en clair', () => {
    expect(texteLocalisation({ article: null, annexe: null, section: 'Alerte', page: 6 })).toBe(
      'Page 6, section « Alerte »',
    );
    expect(
      texteLocalisation({ article: null, annexe: null, section: null, page: null }),
    ).toBeNull();
  });

  it('ouvre un PDF à la bonne page', () => {
    const s = source({ url: 'https://exemple.fr/reco.pdf' });
    const [avecPage] = affirmation({
      sources: [{ source_id: 'reco', localisation: { page: 6 } }],
    }).sources;
    expect(lienDirect(s, avecPage)).toBe('https://exemple.fr/reco.pdf#page=6');
    expect(lienDirect(source())).toBeNull();
  });
});

describe('matrice', () => {
  it('trie les lignes par ordre et ignore le reste', () => {
    const ligne = (id: string, ordre: number) =>
      affirmation({
        id,
        ordre,
        categorie: 'matrice',
        enonce: null,
        verdict: null,
        situation: id,
        critere_explorateur: id,
        fusion: { valeur: 'recommande', grade: 'accord_fort' },
      });
    const lignes = lignesMatrice([ligne('b', 20), affirmation(), ligne('a', 10)]);
    expect(lignes.map((l) => l.id)).toEqual(['a', 'b']);
  });
});

describe('dates', () => {
  it('écrit la date en toutes lettres', () => {
    expect(dateLisible('2026-12-03')).toBe('3 décembre 2026');
  });
});
