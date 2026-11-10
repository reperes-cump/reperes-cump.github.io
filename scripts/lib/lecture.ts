import { readdir, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { parseDocument } from 'yaml';

export interface FichierYaml {
  /** Chemin relatif à la racine du dépôt. */
  chemin: string;
  /** Nom du fichier sans extension. */
  nom: string;
  donnees: unknown;
  erreurs: string[];
}

/** Lit un fichier YAML. Les erreurs de syntaxe sont renvoyées avec leur ligne. */
export async function lireYaml(racine: string, chemin: string): Promise<FichierYaml> {
  const texte = await readFile(join(racine, chemin), 'utf8');
  const document = parseDocument(texte, { prettyErrors: true, uniqueKeys: true });
  return {
    chemin,
    nom: basename(chemin, '.yaml'),
    donnees: document.toJS(),
    erreurs: document.errors.map((erreur) => erreur.message),
  };
}

/** Lit tous les fichiers .yaml d'un dossier, triés par nom. Renvoie aussi les fichiers ignorés. */
export async function lireDossier(
  racine: string,
  dossier: string,
): Promise<{ fichiers: FichierYaml[]; ignores: string[] }> {
  let noms: string[];
  try {
    noms = (await readdir(join(racine, dossier))).sort();
  } catch {
    return { fichiers: [], ignores: [] };
  }
  const yaml = noms.filter((nom) => nom.endsWith('.yaml'));
  const ignores = noms
    .filter((nom) => !nom.endsWith('.yaml') && !nom.startsWith('.'))
    .map((nom) => join(dossier, nom));
  const fichiers = await Promise.all(yaml.map((nom) => lireYaml(racine, join(dossier, nom))));
  return { fichiers, ignores };
}

/** Le fichier existe-t-il ? */
export async function existe(racine: string, chemin: string): Promise<boolean> {
  try {
    await readFile(join(racine, chemin));
    return true;
  } catch {
    return false;
  }
}
