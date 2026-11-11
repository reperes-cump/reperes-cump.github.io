/**
 * Calcul de la carte des CUMP au build : projections, chemins SVG, frontières et étiquettes.
 * Aucune bibliothèque cartographique n'est envoyée au navigateur.
 */
import {
  type GeoPermissibleObjects,
  type GeoProjection,
  geoConicConformal,
  geoMercator,
  geoPath,
} from 'd3-geo';
import { feature, merge, mesh } from 'topojson-client';
import type { GeometryCollection, GeometryObject, Topology } from 'topojson-specification';
import type { Designations, Referentiel, Zones } from '../../schemas/index.ts';
import { normaliserNom } from '../../scripts/lib/regles.ts';

export const LARGEUR = 600;
const HAUTEUR_METRO = 560;
const MARGE = 12;
const ENCART = { y: HAUTEUR_METRO + 16, hauteur: 118, ecart: 10, legende: 18 };
export const HAUTEUR = ENCART.y + ENCART.hauteur + MARGE;

/** Départements d'outre-mer, en encarts, dans cet ordre. */
export const DROM = ['971', '972', '973', '974', '976'] as const;

type Designation = Designations['annexes'][number]['designation'];
type Entree = Designations['annexes'][number]['entrees'][number];

export interface DesignationDepartement {
  annexe: string;
  designation: Designation;
  territoire: string;
  etablissement: string;
  deduit: boolean;
}

export interface DepartementCarte {
  code: string;
  nom: string;
  region: { code: string; nom: string };
  zone: { id: string; nom: string } | null;
  designations: DesignationDepartement[];
  /** Chemin SVG du département. */
  d: string;
  /** Point où poser le symbole de la CUMP zonale. */
  centre: [number, number];
}

export interface Etiquette {
  nom: string;
  x: number;
  y: number;
}

export interface Encart {
  code: string;
  nom: string;
  zone: string | null;
  x: number;
  y: number;
  largeur: number;
  hauteur: number;
}

export interface CarteCalculee {
  departements: DepartementCarte[];
  frontieresRegions: string;
  frontieresZones: string;
  etiquettesRegions: Etiquette[];
  etiquettesZones: Etiquette[];
  encarts: Encart[];
}

/** Désignations de chaque département, dans l'ordre des annexes. */
export function designationsParDepartement(
  designations: Designations,
): Map<string, DesignationDepartement[]> {
  const resultat = new Map<string, DesignationDepartement[]>();
  for (const annexe of designations.annexes) {
    for (const e of annexe.entrees as Entree[]) {
      resultat.set(e.departement, [
        ...(resultat.get(e.departement) ?? []),
        {
          annexe: annexe.annexe,
          designation: annexe.designation,
          territoire: e.territoire,
          etablissement: e.etablissement,
          deduit: e.departement_deduit,
        },
      ]);
    }
  }
  return resultat;
}

/** Zone de chaque département, d'après les noms écrits dans le code de la défense. */
export function zonesParDepartement(
  referentiel: Referentiel,
  zones: Zones | null,
): Map<string, { id: string; nom: string }> {
  const parNom = new Map(referentiel.departements.map((d) => [normaliserNom(d.nom), d.code]));
  const resultat = new Map<string, { id: string; nom: string }>();
  for (const zone of zones?.zones ?? []) {
    for (const nom of zone.departements) {
      const code = parNom.get(normaliserNom(nom));
      if (code) resultat.set(code, { id: zone.id, nom: zone.nom });
    }
  }
  return resultat;
}

const arrondi = (n: number) => Math.round(n * 10) / 10;

export function calculerCarte(
  topologie: Topology,
  referentiel: Referentiel,
  zones: Zones | null,
  designations: Designations,
): CarteCalculee {
  const objet = topologie.objects.departements as GeometryCollection<{ code: string }>;
  const tous = feature(topologie, objet).features;
  const code = (g: GeometryObject) => (g.properties as { code?: string } | undefined)?.code ?? '';
  const estDrom = (c: string) => (DROM as readonly string[]).includes(c);

  const infos = new Map(referentiel.departements.map((d) => [d.code, d]));
  const regions = new Map(referentiel.regions.map((r) => [r.code, r.nom]));
  const zoneDe = zonesParDepartement(referentiel, zones);
  const designationsDe = designationsParDepartement(designations);

  // Métropole (Corse comprise) : projection conique conforme, proche du Lambert-93.
  const metropole = tous.filter((f) => !estDrom(f.properties.code));
  const projectionMetro = geoConicConformal()
    .parallels([44, 49])
    .rotate([-3, 0])
    .fitExtent(
      [
        [MARGE, MARGE],
        [LARGEUR - MARGE, HAUTEUR_METRO - MARGE],
      ],
      { type: 'FeatureCollection', features: metropole },
    );
  const cheminMetro = geoPath(projectionMetro).digits(1);

  // Outre-mer : un encart par département, à sa propre échelle.
  const largeurEncart = (LARGEUR - 2 * MARGE - (DROM.length - 1) * ENCART.ecart) / DROM.length;
  const encarts: Encart[] = [];
  const projections = new Map<string, GeoProjection>();
  DROM.forEach((c, i) => {
    const f = tous.find((t) => t.properties.code === c);
    if (!f) return;
    const x = MARGE + i * (largeurEncart + ENCART.ecart);
    projections.set(
      c,
      geoMercator().fitExtent(
        [
          [x + 6, ENCART.y + ENCART.legende + 4],
          [x + largeurEncart - 6, ENCART.y + ENCART.hauteur - 6],
        ],
        f,
      ),
    );
    encarts.push({
      code: c,
      nom: infos.get(c)?.nom ?? c,
      zone: zoneDe.get(c)?.nom ?? null,
      x: arrondi(x),
      y: ENCART.y,
      largeur: arrondi(largeurEncart),
      hauteur: ENCART.hauteur,
    });
  });

  const departements: DepartementCarte[] = tous.map((f) => {
    const c = f.properties.code;
    const projection = projections.get(c);
    const chemin = projection ? geoPath(projection).digits(1) : cheminMetro;
    const [cx, cy] = chemin.centroid(f);
    const info = infos.get(c);
    return {
      code: c,
      nom: info?.nom ?? c,
      region: { code: info?.region ?? '', nom: regions.get(info?.region ?? '') ?? '' },
      zone: zoneDe.get(c) ?? null,
      designations: designationsDe.get(c) ?? [],
      d: chemin(f) ?? '',
      centre: [arrondi(cx), arrondi(cy)],
    };
  });
  departements.sort((a, b) => a.code.localeCompare(b.code));

  // Frontières entre régions ou entre zones (métropole : les encarts n'en ont pas d'internes).
  const groupeDe = (cle: (c: string) => string) => (a: GeometryObject, b: GeometryObject) =>
    a !== b && cle(code(a)) !== cle(code(b));
  const regionDe = (c: string) => infos.get(c)?.region ?? c;
  const zoneIdDe = (c: string) => zoneDe.get(c)?.id ?? c;
  const frontieres = (cle: (c: string) => string) =>
    cheminMetro(mesh(topologie, objet, groupeDe(cle)) as GeoPermissibleObjects) ?? '';

  // Étiquettes : au centre de chaque région ou zone de métropole.
  const etiquettes = (cle: (c: string) => string, nom: (k: string) => string) => {
    const groupes = new Map<string, GeometryObject[]>();
    for (const g of objet.geometries) {
      if (estDrom(code(g))) continue;
      const k = cle(code(g));
      groupes.set(k, [...(groupes.get(k) ?? []), g]);
    }
    return [...groupes].map(([k, geometries]) => {
      const [x, y] = cheminMetro.centroid(merge(topologie, geometries as never));
      return { nom: nom(k), x: arrondi(x), y: arrondi(y) };
    });
  };
  const nomsZones = new Map((zones?.zones ?? []).map((z) => [z.id, z.nom]));

  return {
    departements,
    frontieresRegions: frontieres(regionDe),
    frontieresZones: zones ? frontieres(zoneIdDe) : '',
    etiquettesRegions: etiquettes(regionDe, (k) => regions.get(k) ?? k),
    etiquettesZones: zones ? etiquettes(zoneIdDe, (k) => nomsZones.get(k) ?? k) : [],
    encarts,
  };
}
