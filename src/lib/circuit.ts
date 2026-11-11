import type { Affirmation, Visuel } from '../../schemas/index.ts';

type Element = Visuel['elements'][number];

export interface Noeud {
  element: Element;
  affirmations: Affirmation[];
  /** Éléments rattachés à celui-ci (ex. le suppléant, à côté du référent). */
  notes: { element: Element; affirmations: Affirmation[] }[];
  /** Chemins qui passent par ce nœud. */
  chemins: string[];
  /** Ce qui vient après ce nœud (ex. l'intervention, après l'activation). */
  suites: Noeud[];
}

export interface CircuitPrepare {
  /** Points de départ, un par chemin, dans l'ordre des chemins. */
  entrees: Noeud[];
  /** Étapes communes, dans l'ordre du fichier. */
  suite: Noeud[];
  issues: Noeud[];
  /** Pour chaque chemin, l'ordre dans lequel ses nœuds s'allument. */
  ordres: Record<string, string[]>;
  chemins: Visuel['chemins'];
}

/** Prépare le circuit pour l'affichage : rangées de nœuds et ordre d'allumage de chaque chemin. */
export function preparerCircuit(
  visuel: Visuel,
  trouver: (id: string) => Affirmation,
): CircuitPrepare {
  const cheminsDe = (id: string) =>
    visuel.chemins
      .filter((c) => c.etapes.includes(id) || c.issues.includes(id) || c.suites.includes(id))
      .map((c) => c.id);
  const noeud = (element: Element): Noeud => ({
    element,
    affirmations: element.affirmations.map(trouver),
    notes: visuel.elements
      .filter((e) => e.rattache_a === element.id)
      .map((e) => ({ element: e, affirmations: e.affirmations.map(trouver) })),
    chemins: cheminsDe(element.id),
    suites: visuel.elements.filter((e) => e.apres === element.id).map(noeud),
  });

  const parId = new Map(visuel.elements.map((e) => [e.id, e]));
  const idsEntrees = [...new Set(visuel.chemins.map((c) => c.etapes[0]))].filter(
    (id): id is string => Boolean(id),
  );
  const entrees = idsEntrees.flatMap((id) => {
    const element = parId.get(id);
    return element ? [noeud(element)] : [];
  });
  const issues = visuel.elements.filter((e) => e.type === 'issue').map(noeud);
  const suite = visuel.elements
    .filter((e) => !e.rattache_a && !e.apres && e.type !== 'issue' && !idsEntrees.includes(e.id))
    .map(noeud);
  const ordres = Object.fromEntries(
    visuel.chemins.map((c) => [c.id, [...c.etapes, ...c.issues, ...c.suites]]),
  );

  return { entrees, suite, issues, ordres, chemins: visuel.chemins };
}
