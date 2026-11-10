import type { Source } from '../../schemas/index.ts';

/** Libellés d'interface des valeurs du modèle de données. */

export const libellesVerdict = {
  recommande: 'Recommandé',
  deconseille: 'Déconseillé',
  pas_de_consensus: 'Pas de consensus',
  pas_de_conclusion: 'Pas de conclusion',
  silence: 'Silence des textes',
  information: null,
} as const;

/** Explication courte de chaque verdict, affichée dans la légende. */
export const explicationsVerdict: Partial<Record<keyof typeof libellesVerdict, string>> = {
  pas_de_consensus: "les experts ne sont pas d'accord entre eux",
  pas_de_conclusion: 'données insuffisantes',
  silence: "les textes consultés n'en parlent pas",
};

export const phraseSilence = "Les textes consultés n'en parlent pas";

export const libellesGrade = {
  accord_fort: 'accord fort',
  accord_relatif: 'accord relatif',
} as const;

export const libellesAutorite: Record<Source['autorite'], string> = {
  reglementaire: 'Texte réglementaire',
  recommandation_pro: 'Recommandation professionnelle',
  information_institutionnelle: 'Information institutionnelle',
  donnees_publiques: 'Données publiques',
};

export const libellesStatut: Record<Source['statut'], string> = {
  en_vigueur: 'en vigueur',
  abroge: 'abrogé',
  modifie: 'modifié',
  a_verifier: 'statut à vérifier',
};

export const colonnes = {
  alerte: { titre: 'Alerter le référent', court: 'Alerter' },
  activation: { titre: 'Activer la CUMP', court: 'Activer' },
  fusion: { titre: 'Alerter le référent et activer la CUMP', court: 'Alerter et activer' },
} as const;

/** Statut d'une source, sur sa fiche. */
export const libellesStatutFiche: Record<Source['statut'], string> = {
  en_vigueur: 'En vigueur',
  abroge: 'Abrogé',
  modifie: 'Modifié',
  a_verifier: 'À vérifier',
};

export const libellesReutilisation: Record<NonNullable<Source['reutilisation']>, string> = {
  texte_officiel: 'Texte officiel : il peut être cité.',
  courte_citation: 'Courtes citations seulement, avec auteur et source.',
  licence_ouverte: 'Licence ouverte.',
};

/** Groupes de la page Sources, dans l'ordre d'affichage. */
export const groupesAutorite: { autorite: Source['autorite']; titre: string }[] = [
  { autorite: 'reglementaire', titre: 'Textes réglementaires' },
  { autorite: 'recommandation_pro', titre: 'Recommandations professionnelles' },
  { autorite: 'information_institutionnelle', titre: 'Information institutionnelle' },
  { autorite: 'donnees_publiques', titre: 'Données publiques' },
];

/** Ordre des catégories d'information, pour les listes « Cité par ». */
export const ordreCategories = [
  'matrice',
  'cadre',
  'circuit',
  'delais',
  'montee',
  'silence',
  'methode',
] as const;

/** Intitulés des catégories d'information, dans les listes « Cité par ». */
export const libellesCategorie: Record<(typeof ordreCategories)[number] | 'glossaire', string> = {
  matrice: 'Alerter, activer : le tableau',
  cadre: 'Cadre réglementaire',
  circuit: "Circuit d'une demande",
  delais: 'Délais',
  montee: 'Montée en puissance',
  silence: 'Ce que les textes ne disent pas',
  methode: 'Lecture des grades',
  glossaire: 'Glossaire',
};

/** Ordre des types de texte dans un groupe de la page Sources. */
export const ordreTypes: Source['type'][] = [
  'code',
  'decret',
  'arrete',
  'instruction',
  'recommandation',
  'page_institutionnelle',
  'jeu_de_donnees',
];
