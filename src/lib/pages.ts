/** Pages du site, dans l'ordre de la navigation. Une page sans chemin est encore à venir. */
export type PageId = 'accueil' | 'circuit' | 'carte' | 'sources' | 'a-propos';

export const pagesSite: { id: PageId; titre: string; court: string; chemin: string | null }[] = [
  { id: 'circuit', titre: "Circuit d'une demande", court: 'Circuit', chemin: 'circuit' },
  { id: 'carte', titre: 'Carte des CUMP', court: 'Carte', chemin: 'carte' },
  { id: 'sources', titre: 'Sources', court: 'Sources', chemin: 'sources' },
  { id: 'a-propos', titre: 'À propos', court: 'À propos', chemin: 'a-propos' },
];
