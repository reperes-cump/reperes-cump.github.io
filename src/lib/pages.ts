/** Pages du site, dans l'ordre de la navigation. Une page sans chemin est encore à venir. */
export type PageId = 'accueil' | 'circuit' | 'carte' | 'sources' | 'a-propos';

export const pagesSite: { id: PageId; titre: string; chemin: string | null }[] = [
  { id: 'circuit', titre: "Circuit d'une demande", chemin: null },
  { id: 'carte', titre: 'Carte des CUMP', chemin: null },
  { id: 'sources', titre: 'Sources', chemin: 'sources' },
  { id: 'a-propos', titre: 'À propos', chemin: 'a-propos' },
];
