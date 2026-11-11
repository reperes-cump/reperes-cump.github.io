/**
 * Prépare les données de la carte à partir des fichiers publics gardés dans sources-local/ :
 *   - content/territoires/departements.yaml : départements et régions du COG de l'INSEE ;
 *   - content/geo/departements.topo.json : contours des départements, en TopoJSON.
 *
 *   npm run geo:preparer -- <dossier COG> <fichier GeoJSON des contours>
 *   ex. npm run geo:preparer -- sources-local/cog-2026 sources-local/contours-2026/departements-1000m.geojson
 *
 * Seuls les départements du COG sont gardés (les collectivités d'outre-mer sont écartées).
 */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { topology } from 'topojson-server';

const [dossierCog, fichierContours] = process.argv.slice(2);
if (!dossierCog || !fichierContours) {
  console.error('Usage : npm run geo:preparer -- <dossier COG> <fichier GeoJSON des contours>');
  process.exit(1);
}
const racine = new URL('..', import.meta.url).pathname;

/** Lecture d'un CSV dont tous les champs sont entre guillemets (format du COG). */
function lireCsv(texte: string): Record<string, string>[] {
  const lignes = texte.trim().split(/\r?\n/);
  const champs = (ligne: string) =>
    [...ligne.matchAll(/"((?:[^"]|"")*)"/g)].map((m) => (m[1] ?? '').replaceAll('""', '"'));
  const entetes = champs(lignes[0] ?? '');
  return lignes.slice(1).map((ligne) => {
    const valeurs = champs(ligne);
    return Object.fromEntries(entetes.map((e, i) => [e, valeurs[i] ?? '']));
  });
}

const empreinte = (contenu: Buffer) => createHash('sha256').update(contenu).digest('hex');

// 1. Départements et régions (COG).
const fichiers = (await import('node:fs/promises')).readdir(dossierCog);
const noms = await fichiers;
const csvDep = noms.find((n) => /^v_departement_\d{4}\.csv$/.test(n));
const csvReg = noms.find((n) => /^v_region_\d{4}\.csv$/.test(n));
if (!csvDep || !csvReg)
  throw new Error('Fichiers v_departement_AAAA.csv et v_region_AAAA.csv attendus');
const millesime = csvDep.match(/\d{4}/)?.[0] ?? '';
const brutDep = await readFile(join(dossierCog, csvDep));
const brutReg = await readFile(join(dossierCog, csvReg));
const regions = lireCsv(brutReg.toString('utf8')).map((r) => ({
  code: r.REG ?? '',
  nom: r.LIBELLE ?? '',
}));
const departements = lireCsv(brutDep.toString('utf8')).map((d) => ({
  code: d.DEP ?? '',
  nom: d.LIBELLE ?? '',
  region: d.REG ?? '',
}));

const q = (s: string) => JSON.stringify(s);
const yaml = [
  `# Départements et régions : Code officiel géographique de l'INSEE au 1er janvier ${millesime}.`,
  `# Fichier produit par scripts/geo-preparer.ts à partir de ${csvDep} et ${csvReg}.`,
  'source_id: cog-insee',
  `millesime: "${millesime}"`,
  'regions:',
  ...regions.map((r) => `  - { code: "${r.code}", nom: ${q(r.nom)} }`),
  'departements:',
  ...departements.map((d) => `  - { code: "${d.code}", nom: ${q(d.nom)}, region: "${d.region}" }`),
  '',
].join('\n');
await writeFile(join(racine, 'content/territoires/departements.yaml'), yaml, 'utf8');

// 2. Contours des départements, réduits aux départements du COG.
const brutContours = await readFile(fichierContours);
const geojson = JSON.parse(brutContours.toString('utf8')) as GeoJSON.FeatureCollection;
const codes = new Set(departements.map((d) => d.code));
const gardes = geojson.features
  .filter((f) => codes.has(String(f.properties?.code)))
  .map((f) => ({
    type: 'Feature' as const,
    properties: { code: String(f.properties?.code) },
    geometry: f.geometry,
  }));
const manquants = [...codes].filter((c) => !gardes.some((f) => f.properties.code === c));
if (manquants.length) throw new Error(`Contours absents pour : ${manquants.join(', ')}`);
const collection: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: gardes };
const topo = topology({ departements: collection }, 1e5);
await writeFile(
  join(racine, 'content/geo/departements.topo.json'),
  `${JSON.stringify(topo)}\n`,
  'utf8',
);

console.log(`COG ${millesime} : ${departements.length} départements, ${regions.length} régions.`);
console.log(`Contours : ${gardes.length} départements gardés sur ${geojson.features.length}.`);
console.log(`Empreintes SHA-256 :`);
console.log(`  ${empreinte(brutDep)}  ${csvDep}`);
console.log(`  ${empreinte(brutReg)}  ${csvReg}`);
console.log(`  ${empreinte(brutContours)}  ${basename(fichierContours)}`);
