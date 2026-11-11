import { describe, expect, it } from 'vitest';
import { designationsSchema, visuelSchema } from '../../schemas/index.ts';
import { verifierCoherence, verifierPublication } from '../../scripts/lib/regles.ts';
import { affirmation, contenu, source } from './fabrique.ts';

const messages = (problemes: { message: string }[]) => problemes.map((p) => p.message);

describe('cohérence entre fichiers', () => {
  it('signale une source inconnue', () => {
    const a = affirmation({ sources: [{ source_id: 'inconnue' }] });
    const problemes = verifierCoherence(contenu({ affirmations: new Map([[a.id, a]]) }));
    expect(messages(problemes)).toContain('source inconnue : inconnue');
  });

  it('exige le grade d’une recommandation professionnelle', () => {
    const a = affirmation({ verdict: { valeur: 'recommande' } });
    const problemes = verifierCoherence(contenu({ affirmations: new Map([[a.id, a]]) }));
    expect(messages(problemes)).toContain(
      'grade obligatoire pour une recommandation professionnelle',
    );
  });

  it('accepte un grade signalé « à relever »', () => {
    const a = affirmation({ verdict: { valeur: 'recommande' }, a_relever: ['grade'] });
    expect(verifierCoherence(contenu({ affirmations: new Map([[a.id, a]]) }))).toEqual([]);
  });

  it('n’exige pas de grade pour un texte réglementaire', () => {
    const a = affirmation({ verdict: { valeur: 'recommande' }, sources: [{ source_id: 'loi' }] });
    const sources = new Map([
      ['loi', source({ id: 'loi', autorite: 'reglementaire', type: 'code' })],
    ]);
    expect(verifierCoherence(contenu({ sources, affirmations: new Map([[a.id, a]]) }))).toEqual([]);
  });

  it('signale un visuel qui renvoie à une affirmation inconnue', () => {
    const visuel = visuelSchema.parse({ elements: [{ id: 'etape', affirmations: ['absente'] }] });
    const problemes = verifierCoherence(contenu({ visuels: new Map([['circuit', visuel]]) }));
    expect(messages(problemes)).toContain('élément etape : affirmation inconnue : absente');
  });

  describe('désignations', () => {
    const arrete = source({
      id: 'arrete',
      type: 'arrete',
      autorite: 'reglementaire',
      annexes: [{ numero: '1', intitule: 'CUMP régionales', designation: 'regionale', nombre: 2 }],
    });
    const designations = (departements: string[]) =>
      designationsSchema.parse({
        source_id: 'arrete',
        annexes: [
          {
            annexe: '1',
            designation: 'regionale',
            entrees: departements.map((departement) => ({
              territoire: 'Région',
              etablissement: 'CHU',
              departement,
              departement_deduit: true,
            })),
          },
        ],
      });
    const sources = new Map([['arrete', arrete]]);

    it('accepte une annexe conforme au nombre relevé dans le texte', () => {
      expect(
        verifierCoherence(contenu({ sources, designations: designations(['69', '13']) })),
      ).toEqual([]);
    });

    it('signale un nombre différent de celui du texte', () => {
      const problemes = verifierCoherence(contenu({ sources, designations: designations(['69']) }));
      expect(messages(problemes)).toContain('annexe 1 : 1 entrées, la source en indique 2');
    });

    it('signale un département en double dans une annexe', () => {
      const problemes = verifierCoherence(
        contenu({ sources, designations: designations(['69', '69']) }),
      );
      expect(messages(problemes)).toContain('annexe 1 : département en double : 69');
    });

    it('signale un département absent du COG, quand la liste est présente', () => {
      const problemes = verifierCoherence(
        contenu({
          sources,
          designations: designations(['69', '13']),
          departements: new Set(['69']),
        }),
      );
      expect(messages(problemes)).toContain('département absent du COG : 13');
    });
  });
});

describe('mode publication', () => {
  it('refuse une affirmation non vérifiée', () => {
    const a = affirmation();
    const problemes = verifierPublication(contenu({ affirmations: new Map([[a.id, a]]) }));
    expect(messages(problemes)).toContain('non vérifiée (verifie_le vide)');
  });

  it('refuse un vérificateur autre que le mainteneur', () => {
    const a = affirmation({ verifie_le: '2026-12-01', verifie_par: 'quelquun' });
    const problemes = verifierPublication(contenu({ affirmations: new Map([[a.id, a]]) }));
    expect(messages(problemes)).toContain('verifie_par doit être mainteneur');
  });

  it('refuse une localisation sans page ni article', () => {
    const a = affirmation({ sources: [{ source_id: 'reco' }] });
    const problemes = verifierPublication(contenu({ affirmations: new Map([[a.id, a]]) }));
    expect(messages(problemes)).toContain(
      'reco : localisation imprécise (page ou article attendu)',
    );
  });

  it('refuse une source citée encore « à vérifier »', () => {
    const a = affirmation();
    const sources = new Map([['reco', source({ statut: 'a_verifier' })]]);
    const problemes = verifierPublication(contenu({ sources, affirmations: new Map([[a.id, a]]) }));
    expect(messages(problemes)).toContain('statut « à vérifier »');
  });
});

describe('voir aussi', () => {
  it('signale un renvoi vers une information inconnue', () => {
    const a = affirmation({ voir_aussi: ['absente'] });
    const problemes = verifierCoherence(contenu({ affirmations: new Map([[a.id, a]]) }));
    expect(messages(problemes)).toContain('voir_aussi : affirmation inconnue : absente');
  });

  it('accepte un renvoi vers une autre information', () => {
    const a = affirmation({ voir_aussi: ['autre'] });
    const b = affirmation({ id: 'autre' });
    const affirmations = new Map([
      [a.id, a],
      [b.id, b],
    ]);
    expect(verifierCoherence(contenu({ affirmations }))).toEqual([]);
  });
});
