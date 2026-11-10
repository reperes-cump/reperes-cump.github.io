/**
 * Données provisoires de la maquette, saisies à la main.
 *
 * Elles seront remplacées par les fichiers YAML de `content/`, validés par
 * schéma. Rien ici n'est vérifié : aucune page, aucune section et aucun extrait
 * n'ont encore été relevés dans les sources.
 */

export type Valeur =
  | 'recommande'
  | 'deconseille'
  | 'pas_de_consensus'
  | 'pas_de_conclusion'
  | 'silence';

export type Grade = 'accord_fort' | 'accord_relatif';

export interface Localisation {
  /** null tant que la section n'a pas été relevée dans la source. */
  section: string | null;
  /** null tant que la page n'a pas été relevée dans la source. */
  page: number | null;
}

export interface Verdict {
  valeur: Valeur;
  grade?: Grade;
  localisation: Localisation;
  /** Libellé particulier de la source, quand il remplace le libellé du verdict. */
  libelle?: string;
}

export interface LigneMatrice {
  id: string;
  situation: string;
  alerte: Verdict;
  activation: Verdict;
  /** Une seule cellule couvre les deux colonnes. */
  fusionnee?: boolean;
}

export interface Source {
  id: string;
  titre: string;
  reference: string;
  libelle_court: string;
  autorite: 'reglementaire' | 'recommandation_pro' | 'information_institutionnelle';
  statut: 'en_vigueur' | 'abroge' | 'modifie' | 'a_verifier';
  url: string;
  verifie_le: string | null;
}

const aRelever: Localisation = { section: null, page: null };

const v = (valeur: Valeur, grade?: Grade): Verdict =>
  grade ? { valeur, grade, localisation: aRelever } : { valeur, localisation: aRelever };

export const sourceMatrice: Source = {
  id: 'sfmu-2017',
  titre:
    "Organisation et modalités d'intervention des CUMP. Recommandations SFMU / AFORCUMP-SFP",
  reference:
    'Rerbal D, Prieto N, Vaux J, et al. Ann Fr Med Urgence 2017;7:410-424. DOI 10.1007/s13341-017-0804-7',
  libelle_court: 'SFMU 2017',
  autorite: 'recommandation_pro',
  statut: 'en_vigueur',
  url: 'https://www.sfmu.org/upload/consensus/reco_cump2017.pdf',
  verifie_le: null,
};

/** Toutes les lignes : source sfmu-2017, page à relever. */
export const matrice: LigneMatrice[] = [
  {
    id: 'orsec-novi',
    situation: 'Plan ORSEC NOVI déclenché',
    alerte: {
      ...v('recommande', 'accord_fort'),
      libelle: 'Intervention immédiate recommandée systématiquement',
    },
    activation: {
      ...v('recommande', 'accord_fort'),
      libelle: 'Intervention immédiate recommandée systématiquement',
    },
    fusionnee: true,
  },
  {
    id: 'impact-secours-medicaux',
    situation: 'Impact émotionnel jugé inhabituellement fort par les secours médicaux',
    alerte: v('recommande', 'accord_fort'),
    activation: v('recommande', 'accord_relatif'),
  },
  {
    id: 'impact-secours',
    situation: 'Impact émotionnel jugé inhabituellement fort par les secours',
    alerte: v('recommande', 'accord_relatif'),
    activation: v('pas_de_consensus'),
  },
  {
    id: 'desorganisation-secours',
    situation: 'Réaction émotionnelle qui désorganise les moyens de secours',
    alerte: v('recommande', 'accord_fort'),
    activation: v('recommande', 'accord_fort'),
  },
  {
    id: 'chaos',
    situation: 'Événement potentiellement traumatique entraînant une situation de chaos',
    alerte: v('recommande', 'accord_fort'),
    activation: v('recommande', 'accord_fort'),
  },
  {
    id: 'groupe-social',
    situation: "Déstabilisation d'un groupe social",
    alerte: v('recommande', 'accord_relatif'),
    activation: v('recommande', 'accord_relatif'),
  },
  {
    id: 'impact-temoins',
    situation: 'Impact jugé fort par les témoins',
    alerte: v('pas_de_conclusion'),
    activation: v('pas_de_conclusion'),
  },
  {
    id: 'valence-sociale',
    situation: 'Événement à forte valence sociale ou fort impact médiatique',
    alerte: v('pas_de_consensus'),
    activation: v('pas_de_consensus'),
  },
  {
    id: 'suicide-professionnel',
    situation: 'Suicide en milieu professionnel',
    alerte: v('pas_de_conclusion'),
    activation: v('pas_de_consensus'),
  },
  {
    id: 'deces-accidentel-professionnel',
    situation: 'Décès accidentel en milieu professionnel',
    alerte: v('pas_de_consensus'),
    activation: v('pas_de_consensus'),
  },
  {
    id: 'mort-violente-familial',
    situation: 'Mort violente dans le cadre familial',
    alerte: v('pas_de_conclusion'),
    activation: v('pas_de_consensus'),
  },
  {
    id: 'violence-societale',
    situation: 'Violence sociétale, mouvements de revendication, négociations',
    alerte: v('deconseille', 'accord_fort'),
    activation: v('deconseille', 'accord_fort'),
  },
  {
    id: 'mort-inattendue-nourrisson',
    situation: 'Mort inattendue du nourrisson',
    alerte: v('deconseille', 'accord_fort'),
    activation: v('deconseille', 'accord_relatif'),
  },
  {
    id: 'urgence-psychiatrique',
    situation: 'Urgence psychiatrique',
    alerte: v('deconseille', 'accord_fort'),
    activation: v('deconseille', 'accord_fort'),
  },
  {
    id: 'cas-individuel',
    situation: 'Cas individuel',
    // La note publique exigée pour un silence n'est pas encore fournie.
    alerte: v('silence'),
    activation: v('deconseille', 'accord_fort'),
  },
  {
    id: 'preventive',
    situation: "Alerte ou activation préventive (crainte qu'un événement survienne)",
    alerte: v('pas_de_consensus'),
    activation: v('deconseille', 'accord_relatif'),
  },
];

export const libelles: Record<Valeur, string> = {
  recommande: 'Recommandé',
  deconseille: 'Déconseillé',
  pas_de_consensus: 'Pas de consensus',
  pas_de_conclusion: 'Pas de conclusion',
  silence: 'Silence des textes',
};

export const libellesGrade: Record<Grade, string> = {
  accord_fort: 'accord fort',
  accord_relatif: 'accord relatif',
};

export const libellesAutorite: Record<Source['autorite'], string> = {
  reglementaire: 'Texte réglementaire',
  recommandation_pro: 'Recommandation professionnelle',
  information_institutionnelle: 'Information institutionnelle',
};

export const libellesStatut: Record<Source['statut'], string> = {
  en_vigueur: 'En vigueur',
  abroge: 'Abrogé',
  modifie: 'Modifié',
  a_verifier: 'À vérifier',
};

/** Mention qui remplace tout numéro ou contact de CUMP. */
export const demandeAuSamu = {
  texte: "Toute demande d'intervention de la CUMP s'adresse au SAMU-Centre 15.",
  verdict: v('recommande', 'accord_fort'),
};

/**
 * Lecture des grades, à vérifier dans la section méthodologie de la source.
 * Définitions relevées : accord fort = médiane ≥ 7 et toutes les cotations
 * entre 7 et 9 ; accord relatif = médiane ≥ 7 et toutes les cotations entre
 * 5 et 9. Pour l'accord fort, la condition sur la médiane découle de l'autre :
 * elle n'est pas répétée à l'écran.
 */
export const lectureDesGrades = {
  a_verifier: true,
  methode:
    "Les recommandations ont été votées par un groupe d'experts (méthode HAS du consensus formalisé). Chaque expert a noté chaque proposition de 1 à 9.",
  grades: [
    {
      terme: 'Accord fort',
      definition: 'toutes les notes sont entre 7 et 9.',
    },
    {
      terme: 'Accord relatif',
      definition: "toutes les notes sont entre 5 et 9, et la note médiane est d'au moins 7.",
    },
  ],
  precision:
    '«\u202FPas de consensus\u202F» et «\u202Fpas de conclusion\u202F» sont aussi des résultats de ce vote, pas des oublis du site.',
  localisation: { section: null, page: null } as Localisation,
};

/** Explication courte de chaque verdict, affichée dans la légende. */
export const explications: Partial<Record<Valeur, string>> = {
  pas_de_consensus: "les experts ne sont pas d'accord entre eux",
  pas_de_conclusion: 'données insuffisantes',
  silence: "les textes consultés n'en parlent pas",
};

/** Version et date du contenu : non définies à ce stade. */
export const contenu = {
  version: null as string | null,
  derniere_verification: null as string | null,
};
