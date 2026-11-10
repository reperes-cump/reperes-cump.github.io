import { z } from 'zod';
import {
  affirmationSchema,
  contenuSchema,
  designationsSchema,
  glossaireSchema,
  sourceSchema,
  visuelSchema,
} from '../../schemas/index.ts';
import { existe, type FichierYaml, lireDossier, lireYaml } from './lecture.ts';
import { listerARelever, verifierCoherence, verifierPublication } from './regles.ts';
import { CHEMIN_DESIGNATIONS, CHEMIN_INFOS, type Contenu, type Probleme } from './types.ts';

z.config(z.locales.fr());

export const VISUELS = ['circuit', 'frise', 'pyramide', 'encadre-silence'] as const;
const CHEMIN_DEPARTEMENTS = 'content/territoires/departements.yaml';
const CHEMIN_ZONES = 'content/territoires/zones.yaml';

export interface Resultat {
  contenu: Contenu;
  erreurs: Probleme[];
  avertissements: Probleme[];
  aRelever: Probleme[];
}

/** Valide un fichier avec son schéma ; renvoie les données ou null. */
function valider<T extends z.ZodType>(
  schema: T,
  fichier: FichierYaml,
  erreurs: Probleme[],
): z.output<T> | null {
  for (const message of fichier.erreurs) erreurs.push({ fichier: fichier.chemin, message });
  if (fichier.erreurs.length) return null;
  const resultat = schema.safeParse(fichier.donnees);
  if (resultat.success) return resultat.data;
  for (const issue of resultat.error.issues) {
    const champ = issue.path.map(String).join('.');
    erreurs.push({
      fichier: fichier.chemin,
      message: champ ? `${champ} : ${issue.message}` : issue.message,
    });
  }
  return null;
}

/** Charge un dossier d'éléments identifiés ; l'identifiant doit être le nom du fichier. */
async function chargerCollection<T extends z.ZodType<{ id: string }>>(
  racine: string,
  dossier: string,
  schema: T,
  erreurs: Probleme[],
): Promise<Map<string, z.output<T>>> {
  const { fichiers, ignores } = await lireDossier(racine, dossier);
  for (const chemin of ignores)
    erreurs.push({ fichier: chemin, message: 'extension attendue : .yaml' });
  const elements = new Map<string, z.output<T>>();
  for (const fichier of fichiers) {
    const donnees = valider(schema, fichier, erreurs);
    if (!donnees) continue;
    if (donnees.id !== fichier.nom) {
      erreurs.push({
        fichier: fichier.chemin,
        message: `id « ${donnees.id} » différent du nom du fichier`,
      });
      continue;
    }
    elements.set(donnees.id, donnees);
  }
  return elements;
}

/**
 * Lit et valide tout le dossier content/.
 * En publication, tout doit être vérifié ; en brouillon, seuls la structure et la cohérence comptent.
 */
export async function chargerContenu(
  racine: string,
  { publication = false }: { publication?: boolean } = {},
): Promise<Resultat> {
  const erreurs: Probleme[] = [];
  const avertissements: Probleme[] = [];

  let infos: Contenu['infos'] = null;
  if (await existe(racine, CHEMIN_INFOS)) {
    infos = valider(contenuSchema, await lireYaml(racine, CHEMIN_INFOS), erreurs);
  } else {
    erreurs.push({ fichier: CHEMIN_INFOS, message: 'fichier absent' });
  }

  const sources = await chargerCollection(racine, 'content/sources', sourceSchema, erreurs);
  const affirmations = await chargerCollection(
    racine,
    'content/affirmations',
    affirmationSchema,
    erreurs,
  );

  const visuels: Contenu['visuels'] = new Map();
  let glossaire: Contenu['glossaire'] = null;
  const { fichiers: fichiersVisuels, ignores } = await lireDossier(racine, 'content/visuels');
  for (const chemin of ignores)
    erreurs.push({ fichier: chemin, message: 'extension attendue : .yaml' });
  for (const fichier of fichiersVisuels) {
    if (fichier.nom === 'glossaire') {
      glossaire = valider(glossaireSchema, fichier, erreurs);
    } else if ((VISUELS as readonly string[]).includes(fichier.nom)) {
      const visuel = valider(visuelSchema, fichier, erreurs);
      if (visuel) visuels.set(fichier.nom, visuel);
    } else {
      erreurs.push({
        fichier: fichier.chemin,
        message: `visuel inconnu (attendus : ${[...VISUELS, 'glossaire'].join(', ')})`,
      });
    }
  }

  let designations: Contenu['designations'] = null;
  if (await existe(racine, CHEMIN_DESIGNATIONS)) {
    designations = valider(
      designationsSchema,
      await lireYaml(racine, CHEMIN_DESIGNATIONS),
      erreurs,
    );
  } else {
    erreurs.push({ fichier: CHEMIN_DESIGNATIONS, message: 'fichier absent' });
  }

  // Liste des départements (COG) et composition des zones : ajoutées avec la carte.
  const departements: Contenu['departements'] = null;
  if (!(await existe(racine, CHEMIN_DEPARTEMENTS))) {
    avertissements.push({
      fichier: CHEMIN_DEPARTEMENTS,
      message: 'absent : l’existence des codes de département n’est pas encore contrôlée',
    });
  }
  if (!(await existe(racine, CHEMIN_ZONES))) {
    avertissements.push({
      fichier: CHEMIN_ZONES,
      message: 'absent : le niveau « zones » de la carte reste désactivé',
    });
  }

  const contenu: Contenu = {
    infos,
    sources,
    affirmations,
    visuels,
    glossaire,
    designations,
    departements,
  };
  erreurs.push(...verifierCoherence(contenu));
  if (publication) erreurs.push(...verifierPublication(contenu));

  return { contenu, erreurs, avertissements, aRelever: listerARelever(contenu) };
}

/** Regroupe des problèmes par fichier, pour l'affichage. */
export function parFichier(problemes: Probleme[]): Map<string, string[]> {
  const groupes = new Map<string, string[]>();
  for (const { fichier, message } of problemes) {
    groupes.set(fichier, [...(groupes.get(fichier) ?? []), message]);
  }
  return new Map([...groupes].sort(([a], [b]) => a.localeCompare(b)));
}
