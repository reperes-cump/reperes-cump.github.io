import type { Affirmation, Verdict } from '../../schemas/index.ts';
import type { Contenu } from './types.ts';

const LICENCE = {
  licence: 'CC BY 4.0',
  licence_url: 'https://creativecommons.org/licenses/by/4.0/deed.fr',
  reserve:
    'Les extraits de sources restent soumis aux droits de leurs auteurs et éditeurs. Les textes officiels peuvent être cités.',
};

/** Échappe une valeur pour un CSV (RFC 4180). */
export function celluleCsv(valeur: unknown): string {
  if (valeur === null || valeur === undefined) return '';
  const texte = String(valeur);
  return /[",\r\n]/.test(texte) ? `"${texte.replaceAll('"', '""')}"` : texte;
}

export function versCsv(entetes: string[], lignes: unknown[][]): string {
  return `${[entetes, ...lignes].map((ligne) => ligne.map(celluleCsv).join(',')).join('\r\n')}\r\n`;
}

const valeur = (v: Verdict | null | undefined) => v?.valeur ?? null;
const grade = (v: Verdict | null | undefined) => v?.grade ?? null;

function ligneAffirmation(a: Affirmation): unknown[] {
  return [
    a.id,
    a.categorie,
    a.enonce ?? a.situation,
    valeur(a.verdict ?? a.fusion),
    grade(a.verdict ?? a.fusion),
    valeur(a.verdicts?.alerte),
    grade(a.verdicts?.alerte),
    valeur(a.verdicts?.activation),
    grade(a.verdicts?.activation),
    [...new Set(a.sources.map((r) => r.source_id))].join(' '),
    a.note_publique,
    a.verifie_le,
  ];
}

/** Fichiers du jeu de données ouvert, publiés sous /donnees/. */
export function donneesOuvertes(contenu: Contenu): Record<string, string> {
  const entete = {
    jeu_de_donnees: 'Repères CUMP',
    version_contenu: contenu.infos?.version ?? null,
    derniere_verification: contenu.infos?.derniere_verification ?? null,
    ...LICENCE,
  };
  const affirmations = [...contenu.affirmations.values()];
  const sources = [...contenu.sources.values()];

  return {
    'affirmations.json': `${JSON.stringify({ ...entete, affirmations }, null, 2)}\n`,
    'sources.json': `${JSON.stringify({ ...entete, sources }, null, 2)}\n`,
    'affirmations.csv': versCsv(
      [
        'id',
        'categorie',
        'texte',
        'valeur',
        'grade',
        'valeur_alerte',
        'grade_alerte',
        'valeur_activation',
        'grade_activation',
        'sources',
        'note_publique',
        'verifie_le',
      ],
      affirmations.map(ligneAffirmation),
    ),
    'sources.csv': versCsv(
      [
        'id',
        'titre',
        'type',
        'autorite',
        'statut',
        'date_publication',
        'url',
        'url_archive',
        'sha256',
        'consulte_le',
        'reutilisation',
      ],
      sources.map((s) => [
        s.id,
        s.titre,
        s.type,
        s.autorite,
        s.statut,
        s.date_publication,
        s.url,
        s.url_archive,
        s.sha256,
        s.consulte_le,
        s.reutilisation,
      ]),
    ),
    'LICENCE.txt': [
      'Repères CUMP : jeu de données',
      '',
      `Licence : ${LICENCE.licence} (${LICENCE.licence_url})`,
      LICENCE.reserve,
      '',
    ].join('\n'),
  };
}
