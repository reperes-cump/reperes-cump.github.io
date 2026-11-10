import type { Affirmation, InfosContenu, Source } from '../../schemas/index.ts';

type Reference = Affirmation['sources'][number];
type Localisation = Reference['localisation'];
export type Colonne = 'alerte' | 'activation';

const ESPACE_FINE = ' ';
const INSECABLE = ' ';

/**
 * Typographie française à l'affichage, sans modifier le contenu :
 * espace insécable avant les deux-points, espace fine avant ; ? ! et dans les guillemets.
 */
export function typographie(texte: string): string {
  return texte
    .replace(/ +:(?=\s|$)/g, `${INSECABLE}:`)
    .replace(/(\d) (?=h\b)/g, `$1${INSECABLE}`)
    .replace(/ +([;?!])/g, `${ESPACE_FINE}$1`)
    .replace(/« +/g, `«${ESPACE_FINE}`)
    .replace(/ +»/g, `${ESPACE_FINE}»`);
}

/** Paragraphes d'un texte (séparés par une ligne vide). */
export function paragraphes(texte: string): string[] {
  return texte
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Lignes de matrice, dans l'ordre d'affichage. */
export function lignesMatrice(affirmations: Iterable<Affirmation>): Affirmation[] {
  return [...affirmations]
    .filter((a) => a.categorie === 'matrice')
    .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0) || a.id.localeCompare(b.id));
}

/** Références d'une affirmation regroupées par source, dans l'ordre (une puce par source). */
export function groupesSources(
  affirmation: Affirmation,
  colonne?: Colonne,
): { sourceId: string; references: Reference[] }[] {
  const groupes = new Map<string, Reference[]>();
  for (const reference of affirmation.sources) {
    if (colonne && reference.porte_sur && reference.porte_sur !== colonne) continue;
    groupes.set(reference.source_id, [...(groupes.get(reference.source_id) ?? []), reference]);
  }
  return [...groupes].map(([sourceId, references]) => ({ sourceId, references }));
}

const uniques = (valeurs: (string | number | null)[]) =>
  [...new Set(valeurs.filter((v): v is string | number => v !== null))].map(String);

/** Libellé d'une puce : « SFMU 2017 », « SFMU 2017, p. 6 », « Code de la santé publique, art. R6311-25 ». */
export function libellePuce(source: Source, references: Reference[]): string {
  const articles = uniques(references.map((r) => r.localisation.article));
  const annexes = uniques(references.map((r) => r.localisation.annexe));
  const pages = uniques(references.map((r) => r.localisation.page));
  const precisions = [
    ...(articles.length ? [`art.${INSECABLE}${articles.join(', ')}`] : []),
    ...(annexes.length ? [`annexe${INSECABLE}${annexes.join(', ')}`] : []),
    ...(pages.length ? [`p.${INSECABLE}${pages.join(', ')}`] : []),
  ];
  return [source.libelle_court, ...precisions].join(', ');
}

/** Localisation lisible : « Article R6311-25 », « Page 6, section « … » ». Null si rien n'est relevé. */
export function texteLocalisation(localisation: Localisation): string | null {
  const morceaux = [
    localisation.article ? `article ${localisation.article}` : null,
    localisation.annexe ? `annexe ${localisation.annexe}` : null,
    localisation.page ? `page ${localisation.page}` : null,
    localisation.section ? `section «${ESPACE_FINE}${localisation.section}${ESPACE_FINE}»` : null,
  ].filter((m): m is string => m !== null);
  if (!morceaux.length) return null;
  const texte = morceaux.join(', ');
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

/** Lien direct vers le passage : lien profond, sinon PDF ouvert à la page, sinon le document. */
export function lienDirect(source: Source, reference?: Reference): string | null {
  if (reference?.lien_profond) return reference.lien_profond;
  if (!source.url) return null;
  const page = reference?.localisation.page;
  return page && estPdf(source.url) ? `${source.url}#page=${page}` : source.url;
}

export const estPdf = (url: string) => new URL(url).pathname.toLowerCase().endsWith('.pdf');

export const hote = (url: string) => new URL(url).hostname.replace(/^www\./, '');

/** Date lisible : « 3 décembre 2026 ». */
export function dateLisible(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: 'UTC' }).format(
    new Date(`${iso}T00:00:00Z`),
  );
}

/** Identifiant de panneau, unique dans la page. */
export const idPanneau = (affirmation: string, sourceId: string, colonne?: Colonne | 'fusion') =>
  ['panneau', affirmation, colonne, sourceId].filter(Boolean).join('-');

/** Date de publication, complète ou partielle : « 7 janvier 2013 », « janvier 2013 », « 2017 ». */
export function datePublication(date: string): string {
  if (/^\d{4}$/.test(date)) return date;
  if (/^\d{4}-\d{2}$/.test(date)) {
    return new Intl.DateTimeFormat('fr-FR', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${date}-01T00:00:00Z`));
  }
  return dateLisible(date);
}

/** État du contenu, affiché sur chaque page. */
export function etatContenu(infos: InfosContenu | null): string {
  return infos?.version && infos.derniere_verification
    ? `Version ${infos.version} du contenu, vérifiée le ${dateLisible(infos.derniere_verification)}.`
    : 'Contenu en brouillon, pas encore vérifié.';
}

/** Accord en nombre : « 1 information », « 3 informations ». */
export const nombre = (n: number, singulier: string, pluriel = `${singulier}s`) =>
  `${n} ${n > 1 ? pluriel : singulier}`;
