import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { Topology } from 'topojson-specification';
import { beforeAll, describe, expect, it } from 'vitest';
import { departementsSchema, designationsSchema, zonesSchema } from '../schemas/index.ts';
import { lireYaml } from '../scripts/lib/lecture.ts';
import { type CarteCalculee, calculerCarte, DROM, LARGEUR } from '../src/lib/carte.ts';

const racine = fileURLToPath(new URL('..', import.meta.url));
const charger = async () => {
  const topologie = JSON.parse(
    await readFile(`${racine}content/geo/departements.topo.json`, 'utf8'),
  ) as Topology;
  const referentiel = departementsSchema.parse(
    (await lireYaml(racine, 'content/territoires/departements.yaml')).donnees,
  );
  const zones = zonesSchema.parse(
    (await lireYaml(racine, 'content/territoires/zones.yaml')).donnees,
  );
  const designations = designationsSchema.parse(
    (await lireYaml(racine, 'content/territoires/designations.yaml')).donnees,
  );
  return calculerCarte(topologie, referentiel, zones, designations);
};

describe('carte des CUMP', () => {
  let carte: CarteCalculee;
  beforeAll(async () => {
    carte = await charger();
  });

  it('dessine les 101 départements du COG', () => {
    expect(carte.departements).toHaveLength(101);
    for (const d of carte.departements) expect(d.d.length, d.code).toBeGreaterThan(20);
  });

  it('place les départements d’outre-mer dans leurs encarts', () => {
    expect(carte.encarts.map((e) => e.code)).toEqual([...DROM]);
    for (const e of carte.encarts) {
      const [x, y] = carte.departements.find((d) => d.code === e.code)?.centre ?? [0, 0];
      expect(x).toBeGreaterThan(e.x);
      expect(x).toBeLessThan(e.x + e.largeur);
      expect(y).toBeGreaterThan(e.y);
      expect(y).toBeLessThan(e.y + e.hauteur);
    }
  });

  it('garde la métropole dans la largeur de la carte', () => {
    const metro = carte.departements.filter((d) => !(DROM as readonly string[]).includes(d.code));
    for (const d of metro) {
      expect(d.centre[0]).toBeGreaterThan(0);
      expect(d.centre[0]).toBeLessThan(LARGEUR);
    }
  });

  it('cumule les désignations d’un même département', () => {
    const nancy = carte.departements.find((d) => d.code === '54');
    expect(nancy?.designations.map((x) => x.designation)).toEqual(['renforcee', 'zonale']);
    expect(carte.departements.find((d) => d.code === '69')?.zone?.nom).toBe('Sud-Est');
  });

  it('trace et nomme les régions et les zones de métropole', () => {
    expect(carte.frontieresRegions.length).toBeGreaterThan(100);
    expect(carte.frontieresZones.length).toBeGreaterThan(100);
    expect(carte.etiquettesRegions).toHaveLength(13);
    expect(carte.etiquettesZones).toHaveLength(7);
  });
});
