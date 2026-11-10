import type {
  Affirmation,
  Designations,
  Glossaire,
  InfosContenu,
  Source,
  Visuel,
} from '../../schemas/index.ts';

export interface Contenu {
  infos: InfosContenu | null;
  sources: Map<string, Source>;
  affirmations: Map<string, Affirmation>;
  /** circuit, frise, pyramide, encadre-silence */
  visuels: Map<string, Visuel>;
  glossaire: Glossaire | null;
  designations: Designations | null;
  /** Codes de département du COG, quand la liste est présente. */
  departements: Set<string> | null;
}

export interface Probleme {
  fichier: string;
  message: string;
}

export const cheminSource = (id: string) => `content/sources/${id}.yaml`;
export const cheminAffirmation = (id: string) => `content/affirmations/${id}.yaml`;
export const cheminVisuel = (nom: string) => `content/visuels/${nom}.yaml`;
export const CHEMIN_DESIGNATIONS = 'content/territoires/designations.yaml';
export const CHEMIN_INFOS = 'content/contenu.yaml';
