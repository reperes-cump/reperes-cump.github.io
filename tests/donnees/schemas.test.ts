import { describe, expect, it } from 'vitest';
import { affirmationSchema, sourceSchema } from '../../schemas/index.ts';

const ligneMatrice = {
  id: 'matrice-test',
  categorie: 'matrice',
  situation: 'Situation de test',
  verdicts: {
    alerte: { valeur: 'recommande', grade: 'accord_fort' },
    activation: { valeur: 'pas_de_consensus' },
  },
  sources: [
    { source_id: 'reco', porte_sur: 'alerte' },
    { source_id: 'reco', porte_sur: 'activation' },
  ],
  critere_explorateur: 'test',
};

describe('schéma des affirmations', () => {
  it('accepte une ligne de matrice complète', () => {
    expect(affirmationSchema.safeParse(ligneMatrice).success).toBe(true);
  });

  it('refuse une affirmation sans source', () => {
    const resultat = affirmationSchema.safeParse({ ...ligneMatrice, sources: [] });
    expect(resultat.success).toBe(false);
  });

  it('refuse un champ inconnu', () => {
    const resultat = affirmationSchema.safeParse({ ...ligneMatrice, commentaire: 'x' });
    expect(resultat.success).toBe(false);
  });

  it('exige « porte_sur » sur chaque source d’une ligne à deux colonnes', () => {
    const resultat = affirmationSchema.safeParse({
      ...ligneMatrice,
      sources: [{ source_id: 'reco' }],
    });
    expect(resultat.success).toBe(false);
  });

  it('refuse « verdicts » et « fusion » ensemble', () => {
    const resultat = affirmationSchema.safeParse({
      ...ligneMatrice,
      fusion: { valeur: 'recommande', grade: 'accord_fort' },
    });
    expect(resultat.success).toBe(false);
  });

  it('exige une note publique pour un silence des textes', () => {
    const silence = {
      ...ligneMatrice,
      verdicts: { ...ligneMatrice.verdicts, alerte: { valeur: 'silence' } },
    };
    expect(affirmationSchema.safeParse(silence).success).toBe(false);
    expect(
      affirmationSchema.safeParse({ ...silence, note_publique: 'Ce qui manque.' }).success,
    ).toBe(true);
    expect(affirmationSchema.safeParse({ ...silence, a_relever: ['note publique'] }).success).toBe(
      true,
    );
  });

  it('exige un énoncé et un verdict hors matrice', () => {
    const resultat = affirmationSchema.safeParse({
      id: 'cadre-test',
      categorie: 'cadre',
      sources: [{ source_id: 'reco' }],
    });
    expect(resultat.success).toBe(false);
  });

  it('refuse « verifie_le » sans « verifie_par »', () => {
    const resultat = affirmationSchema.safeParse({ ...ligneMatrice, verifie_le: '2026-12-01' });
    expect(resultat.success).toBe(false);
  });
});

describe('schéma des sources', () => {
  const base = {
    id: 'texte',
    titre: 'Texte',
    libelle_court: 'Texte',
    type: 'arrete',
    autorite: 'reglementaire',
    statut: 'en_vigueur',
  };

  it('accepte une date de publication partielle', () => {
    expect(sourceSchema.safeParse({ ...base, date_publication: '2017' }).success).toBe(true);
    expect(sourceSchema.safeParse({ ...base, date_publication: 2017 }).success).toBe(true);
  });

  it('refuse une URL non HTTPS', () => {
    expect(sourceSchema.safeParse({ ...base, url: 'http://exemple.fr' }).success).toBe(false);
  });

  it('exige le texte modificateur d’un texte abrogé', () => {
    expect(sourceSchema.safeParse({ ...base, statut: 'abroge' }).success).toBe(false);
  });

  it('refuse une empreinte mal formée', () => {
    expect(sourceSchema.safeParse({ ...base, sha256: 'abc' }).success).toBe(false);
  });
});
