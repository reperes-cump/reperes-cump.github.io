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
