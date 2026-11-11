import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ecrire, planifier } from '../scripts/lib/enregistrement.ts';
import { chercherDansPage, chercherPartout, comparable } from '../scripts/lib/pdf.ts';
import { localisationPrecise } from '../scripts/lib/regles.ts';
import { type Fiche, preparerFiches, propositionsSchema } from '../scripts/lib/verification.ts';
import { affirmation, contenu, source } from './donnees/fabrique.ts';

const PAGE = `Alerte de la CUMP
Il est recommandé d’alerter la CUMP :
●● dans les situations où l’impact émotionnel est estimé
inhabituellement fort par les secours ; Accord relatif
●● dans les événements potentiellement traumatiques entraînant une situation de chaos (confusion géné-
rale) ; Accord fort
Activation de la CUMP
Il est recommandé d’activer la CUMP :
●● dans les événements potentiellement traumatiques entraînant une situation de chaos (confusion générale) ; Accord fort`;

describe('recherche dans un PDF', () => {
  it('ignore espaces, ponctuation, apostrophes et coupures de mots', () => {
    expect(comparable('d’alerter la CUMP :').lettres).toBe(
      comparable("d'alerter la  CUMP").lettres,
    );
    expect(chercherDansPage(PAGE, 'situation de chaos (confusion générale)')).not.toBeNull();
  });

  it('se place après les ancres pour distinguer deux passages identiques', () => {
    const extrait = 'situation de chaos (confusion générale)';
    const premier = chercherDansPage(PAGE, extrait, ['Il est recommandé d’alerter la CUMP :']);
    const second = chercherDansPage(PAGE, extrait, ['Il est recommandé d’activer la CUMP :']);
    expect(premier && second && second.debut > premier.debut).toBe(true);
    expect(chercherDansPage(PAGE, 'introuvable ici')).toBeNull();
  });

  it('compte les occurrences dans tout le texte', () => {
    expect(chercherPartout([PAGE, 'rien'], 'chaos')).toHaveLength(2);
    expect(chercherPartout([PAGE], 'scolaire')).toHaveLength(0);
  });
});

describe('localisation assez précise pour publier', () => {
  const r = (localisation: Record<string, unknown>) =>
    affirmation({ sources: [{ source_id: 'reco', localisation }] }).sources[0];
  it('accepte une page ou un article ; une rubrique seulement pour une page web', () => {
    const reco = source();
    const web = source({ type: 'page_institutionnelle' });
    expect(localisationPrecise(r({ page: 2 }), reco)).toBe(true);
    expect(localisationPrecise(r({ section: 'Historique' }), reco)).toBe(false);
    expect(localisationPrecise(r({ section: 'Historique' }), web)).toBe(true);
  });
});

/** Contenu d'essai : une recommandation en PDF, une information sans page ni extrait. */
const essai = () => {
  const sources = new Map([
    ['reco', source({ url: 'https://exemple.org/reco.pdf', statut: 'a_verifier' })],
  ]);
  const a = affirmation({
    id: 'chaos',
    sources: [{ source_id: 'reco' }],
    a_relever: ['page'],
  });
  return contenu({ sources, affirmations: new Map([[a.id, a]]) });
};

const textes = new Map([
  ['reco', { fichier: 'textes/reco.pdf', sha256: 'b'.repeat(64), pages: ['', PAGE] }],
]);

const fichesDe = (props: unknown) =>
  preparerFiches({
    contenu: essai(),
    propositions: propositionsSchema.parse({ releve_le: '2026-11-11', ...(props as object) }),
    textes,
  }).fiches;

const fiche = (fiches: Fiche[], id: string) => {
  const f = fiches.find((x) => x.id === id);
  if (!f) throw new Error(`fiche absente : ${id}`);
  return f;
};

describe('fiches de vérification', () => {
  it('retrouve le passage, corrige la page et prépare les écritures', () => {
    const fiches = fichesDe({
      informations: {
        chaos: {
          passages: [
            {
              ref: 0,
              source: 'reco',
              page: 1,
              apres: ['Il est recommandé d’activer la CUMP :'],
              extrait: 'situation de chaos (confusion générale)',
            },
          ],
        },
      },
    });
    const f = fiche(fiches, 'information:chaos');
    expect(f.pret).toBe(true);
    expect(f.html).toContain('Passage retrouvé page 2 et non page 1');
    expect(f.ecritures).toContainEqual({
      fichier: 'content/affirmations/chaos.yaml',
      chemin: ['sources', 0, 'localisation', 'page'],
      valeur: 2,
    });
    expect(f.ecritures).toContainEqual({
      fichier: 'content/affirmations/chaos.yaml',
      chemin: ['a_relever'],
      valeur: [],
    });
  });

  it('laisse en attente une fiche dont le passage est introuvable ou manquant', () => {
    const introuvable = fichesDe({
      informations: {
        chaos: { passages: [{ ref: 0, source: 'reco', page: 2, extrait: 'absent' }] },
      },
    });
    expect(fiche(introuvable, 'information:chaos').pret).toBe(false);
    expect(fiche(fichesDe({}), 'information:chaos').attente).toContain('passage à retrouver');
  });

  it('propose l’empreinte du PDF enregistré sur la fiche du texte', () => {
    const f = fiche(
      fichesDe({ textes: { reco: { champs: { statut: 'en_vigueur' } } } }),
      'texte:reco',
    );
    expect(f.ecritures).toContainEqual({
      fichier: 'content/sources/reco.yaml',
      chemin: ['sha256'],
      valeur: 'b'.repeat(64),
    });
    expect(f.ecritures).toContainEqual({
      fichier: 'content/sources/reco.yaml',
      chemin: ['statut'],
      valeur: 'en_vigueur',
    });
  });
});

describe('enregistrement des choix', () => {
  const fiches = fichesDe({
    informations: {
      chaos: { passages: [{ ref: 0, source: 'reco', page: 2, extrait: 'situation de chaos' }] },
    },
  });
  const chaos = fiche(fiches, 'information:chaos');

  it('n’écrit que les fiches conformes et non modifiées depuis le choix', () => {
    const { ecritures, bilan } = planifier(
      fiches,
      [
        {
          id: chaos.id,
          decision: 'conforme',
          note: '',
          date: '2026-11-12',
          signature: chaos.signature,
        },
        {
          id: 'texte:reco',
          decision: 'conforme',
          note: '',
          date: '2026-11-12',
          signature: 'ancienne',
        },
        {
          id: 'contenu',
          decision: 'a-revoir',
          note: 'pas encore',
          date: '2026-11-12',
          signature: fiche(fiches, 'contenu').signature,
        },
      ],
      'mainteneur',
    );
    expect(ecritures).toContainEqual({
      fichier: 'content/affirmations/chaos.yaml',
      chemin: ['verifie_le'],
      valeur: '2026-11-12',
    });
    expect(ecritures).toContainEqual({
      fichier: 'content/affirmations/chaos.yaml',
      chemin: ['verifie_par'],
      valeur: 'mainteneur',
    });
    expect(ecritures.some((e) => e.fichier === 'content/sources/reco.yaml')).toBe(false);
    expect(bilan.perimees.map((f) => f.id)).toEqual(['texte:reco']);
    expect(bilan.aRevoir.map((x) => x.note)).toEqual(['pas encore']);
  });

  it('écrit le YAML en gardant les commentaires et le style des guillemets', async () => {
    const racine = await mkdtemp(path.join(os.tmpdir(), 'reperes-'));
    const fichier = 'a.yaml';
    await writeFile(
      path.join(racine, fichier),
      '# Commentaire gardé.\nstatut: a_verifier\nsources:\n  - localisation:\n      page: null\na_relever:\n  - "page"\nverifie_le: null\n',
    );
    await ecrire(racine, [
      { fichier, chemin: ['statut'], valeur: 'en_vigueur' },
      { fichier, chemin: ['sources', 0, 'localisation', 'page'], valeur: 6 },
      { fichier, chemin: ['a_relever'], valeur: [] },
      { fichier, chemin: ['verifie_le'], valeur: '2026-11-12' },
    ]);
    const texte = await readFile(path.join(racine, fichier), 'utf8');
    expect(texte).toContain('# Commentaire gardé.');
    expect(texte).toContain('statut: en_vigueur');
    expect(texte).toContain('page: 6');
    expect(texte).toContain('a_relever: []');
    expect(texte).toContain('verifie_le: "2026-11-12"');
  });
});
