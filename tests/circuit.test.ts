import { describe, expect, it } from 'vitest';
import { visuelSchema } from '../schemas/index.ts';
import { preparerCircuit } from '../src/lib/circuit.ts';
import { affirmation } from './donnees/fabrique.ts';

describe('préparation du circuit', () => {
  const a = affirmation();
  const visuel = visuelSchema.parse({
    elements: [
      { id: 'demande', type: 'etape', affirmations: [a.id] },
      { id: 'filtre', type: 'etape', affirmations: [a.id] },
      { id: 'suppleant', affirmations: [a.id], rattache_a: 'filtre' },
      { id: 'branche', type: 'branche', affirmations: [a.id] },
      { id: 'oui', type: 'issue', affirmations: [a.id] },
      { id: 'non', type: 'issue', affirmations: [a.id] },
      { id: 'ensuite', type: 'etape', affirmations: [a.id], apres: 'oui' },
    ],
    chemins: [
      {
        id: 'a',
        libelle: 'A',
        etapes: ['demande', 'filtre'],
        issues: ['oui', 'non'],
        suites: ['ensuite'],
      },
      { id: 'b', libelle: 'B', etapes: ['branche'], issues: ['oui'] },
    ],
  });
  const circuit = preparerCircuit(visuel, () => a);

  it('range les points de départ, les étapes communes et les issues', () => {
    expect(circuit.entrees.map((n) => n.element.id)).toEqual(['demande', 'branche']);
    expect(circuit.suite.map((n) => n.element.id)).toEqual(['filtre']);
    expect(circuit.issues.map((n) => n.element.id)).toEqual(['oui', 'non']);
  });

  it('rattache les notes à leur étape et indique les chemins de chaque nœud', () => {
    expect(circuit.suite[0]?.notes.map((n) => n.element.id)).toEqual(['suppleant']);
    expect(circuit.issues[0]?.chemins).toEqual(['a', 'b']);
    expect(circuit.issues[1]?.chemins).toEqual(['a']);
  });

  it('place ce qui suit une issue sous cette issue, hors des étapes communes', () => {
    expect(circuit.issues[0]?.suites.map((n) => n.element.id)).toEqual(['ensuite']);
    expect(circuit.suite.map((n) => n.element.id)).toEqual(['filtre']);
  });

  it('donne l’ordre d’allumage de chaque chemin', () => {
    expect(circuit.ordres).toEqual({
      a: ['demande', 'filtre', 'oui', 'non', 'ensuite'],
      b: ['branche', 'oui'],
    });
  });
});
