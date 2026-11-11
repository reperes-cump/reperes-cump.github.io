/**
 * Lecture du texte d'un PDF de source, page par page, et recherche d'un passage.
 * Outil du mainteneur uniquement (feuille de relecture) : rien de tout cela n'est publié.
 * Nécessite `pdftotext` (paquet poppler : `brew install poppler`).
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const executer = promisify(execFile);

/** Texte de chaque page (index 0 = page 1), dans l'ordre de lecture. */
export async function lirePdf(fichier: string): Promise<string[]> {
  const { stdout } = await executer('pdftotext', ['-enc', 'UTF-8', fichier, '-'], {
    maxBuffer: 64 * 1024 * 1024,
  });
  const pages = stdout.split('\f');
  if (pages.at(-1)?.trim() === '') pages.pop();
  return pages;
}

/**
 * Forme de comparaison : lettres et chiffres en minuscules, sans espace ni ponctuation.
 * Rend la recherche insensible aux retours à la ligne, aux coupures de mots (« géné-rale »),
 * aux apostrophes typographiques et aux puces. `positions` relie chaque caractère gardé à sa
 * place dans le texte d'origine.
 */
export function comparable(texte: string): { lettres: string; positions: number[] } {
  let lettres = '';
  const positions: number[] = [];
  for (let i = 0; i < texte.length; i++) {
    const garde = texte[i]?.normalize('NFKC').toLowerCase() ?? '';
    for (const c of garde) {
      if (/[\p{L}\p{N}]/u.test(c)) {
        lettres += c;
        positions.push(i);
      }
    }
  }
  return { lettres, positions };
}

export interface Occurrence {
  /** Numéro de page (à partir de 1). */
  page: number;
  /** Position dans le texte d'origine de la page. */
  debut: number;
  fin: number;
}

/** Cherche `passage` dans le texte d'une page, après une suite d'ancres facultatives. */
export function chercherDansPage(
  texte: string,
  passage: string,
  ancres: readonly string[] = [],
): { debut: number; fin: number; ancres: { debut: number; fin: number }[] } | null {
  const page = comparable(texte);
  let depart = 0;
  const trouvees: { debut: number; fin: number }[] = [];
  for (const ancre of ancres) {
    const cle = comparable(ancre).lettres;
    const i = cle ? page.lettres.indexOf(cle, depart) : -1;
    if (i === -1) return null;
    trouvees.push({
      debut: page.positions[i] ?? 0,
      fin: (page.positions[i + cle.length - 1] ?? 0) + 1,
    });
    depart = i + cle.length;
  }
  const cle = comparable(passage).lettres;
  if (!cle) return null;
  const i = page.lettres.indexOf(cle, depart);
  if (i === -1) return null;
  return {
    debut: page.positions[i] ?? 0,
    fin: (page.positions[i + cle.length - 1] ?? 0) + 1,
    ancres: trouvees,
  };
}

/** Toutes les occurrences d'un mot ou d'une expression dans le document. */
export function chercherPartout(pages: readonly string[], expression: string): Occurrence[] {
  const cle = comparable(expression).lettres;
  if (!cle) return [];
  const resultat: Occurrence[] = [];
  pages.forEach((texte, index) => {
    const page = comparable(texte);
    let i = page.lettres.indexOf(cle);
    while (i !== -1) {
      resultat.push({
        page: index + 1,
        debut: page.positions[i] ?? 0,
        fin: (page.positions[i + cle.length - 1] ?? 0) + 1,
      });
      i = page.lettres.indexOf(cle, i + cle.length);
    }
  });
  return resultat;
}

/** Texte lisible : mots recollés en fin de ligne, retours à la ligne et puces aplatis. */
export function lisible(texte: string): string {
  return texte
    .replace(/(\p{Ll})-\n(\p{Ll})/gu, '$1$2')
    .replace(/[●•]+/g, '•')
    .replace(/\s+/g, ' ');
}
