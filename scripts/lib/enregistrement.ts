/**
 * Report des choix du mainteneur dans content/ : seules les fiches jugées « Conforme », dont le
 * contenu n'a pas changé depuis le choix, sont écrites ; elles reçoivent verifie_le (date du
 * choix) et verifie_par (identifiant du mainteneur, lu dans content/contenu.yaml).
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { isScalar, parseDocument, Scalar } from 'yaml';
import { z } from 'zod';
import { CHEMIN_INFOS } from './types.ts';
import type { Ecriture, Fiche, Valeur } from './verification.ts';

export const exportSchema = z.object({
  format: z.literal('reperes-cump-verifications'),
  version: z.literal(1),
  decisions: z.array(
    z.object({
      id: z.string().min(1),
      decision: z.enum(['conforme', 'a-revoir']),
      note: z.string().default(''),
      date: z.iso.date(),
      signature: z.string().min(1),
    }),
  ),
});

export type Decision = z.output<typeof exportSchema>['decisions'][number];

export interface Bilan {
  /** Fiches enregistrées comme vérifiées. */
  enregistrees: Fiche[];
  /** Fiches à revoir, avec la remarque du mainteneur. */
  aRevoir: { fiche: Fiche; note: string }[];
  /** Fiches modifiées depuis le choix : à refaire sur la page. */
  perimees: Fiche[];
  /** Lots (carte) dont toutes les fiches ne sont pas encore conformes. */
  lotsIncomplets: string[];
}

/** Calcule les écritures à faire et le bilan, sans rien écrire. */
export function planifier(
  fiches: Fiche[],
  decisions: Decision[],
  mainteneur: string,
): { ecritures: Ecriture[]; bilan: Bilan } {
  const ecritures: Ecriture[] = [];
  const bilan: Bilan = { enregistrees: [], aRevoir: [], perimees: [], lotsIncomplets: [] };
  const valides = new Map<string, Decision>();

  for (const d of decisions) {
    const fiche = fiches.find((f) => f.id === d.id);
    if (!fiche) continue;
    if (fiche.signature !== d.signature) {
      bilan.perimees.push(fiche);
      continue;
    }
    valides.set(d.id, d);
    if (d.decision === 'a-revoir') {
      bilan.aRevoir.push({ fiche, note: d.note });
      continue;
    }
    if (!fiche.pret || fiche.lot) continue;
    ecritures.push(...fiche.ecritures);
    if (fiche.verification) {
      ecritures.push(
        { fichier: fiche.verification, chemin: ['verifie_le'], valeur: d.date },
        { fichier: fiche.verification, chemin: ['verifie_par'], valeur: mainteneur },
      );
    }
    if (fiche.type === 'contenu') {
      ecritures.push({ fichier: CHEMIN_INFOS, chemin: ['derniere_verification'], valeur: d.date });
    }
    bilan.enregistrees.push(fiche);
  }

  // Carte : le fichier n'est daté que lorsque toutes les fiches du lot sont conformes.
  for (const lot of ['designations', 'zones'] as const) {
    const dulot = fiches.filter((f) => f.lot === lot);
    if (!dulot.length || dulot.every((f) => f.deja)) continue;
    const choix = dulot.map((f) => valides.get(f.id));
    if (choix.every((c) => c?.decision === 'conforme') && dulot.every((f) => f.pret)) {
      const date =
        choix
          .map((c) => c?.date ?? '')
          .sort()
          .at(-1) ?? '';
      const fichier = dulot[0]?.verification ?? '';
      ecritures.push(
        { fichier, chemin: ['verifie_le'], valeur: date },
        { fichier, chemin: ['verifie_par'], valeur: mainteneur },
      );
      bilan.enregistrees.push(...dulot);
    } else if (choix.some((c) => c?.decision === 'conforme')) {
      bilan.lotsIncomplets.push(lot);
    }
  }
  return { ecritures, bilan };
}

/** Valeur YAML dans le style des fichiers de content/ : chaînes entre guillemets, sauf les valeurs d'énumération. */
function noeud(doc: ReturnType<typeof parseDocument>, valeur: Valeur) {
  const n = doc.createNode(valeur);
  const styler = (s: unknown) => {
    if (isScalar(s) && typeof s.value === 'string' && !/^[a-z_]+$/.test(s.value)) {
      s.type = Scalar.QUOTE_DOUBLE;
    }
  };
  if (Array.isArray(valeur)) {
    for (const item of (n as { items: unknown[] }).items) styler(item);
    if (!valeur.length) (n as { flow?: boolean }).flow = true;
  } else {
    styler(n);
  }
  return n;
}

/**
 * Applique les écritures aux fichiers YAML (les commentaires sont gardés).
 * Renvoie le contenu d'origine de chaque fichier touché, pour pouvoir revenir en arrière.
 */
export async function ecrire(racine: string, ecritures: Ecriture[]): Promise<Map<string, string>> {
  const parFichier = new Map<string, Ecriture[]>();
  for (const e of ecritures) parFichier.set(e.fichier, [...(parFichier.get(e.fichier) ?? []), e]);
  const originaux = new Map<string, string>();
  for (const [fichier, liste] of parFichier) {
    const chemin = path.join(racine, fichier);
    const texte = await readFile(chemin, 'utf8');
    originaux.set(fichier, texte);
    const doc = parseDocument(texte);
    for (const e of liste) doc.setIn(e.chemin, noeud(doc, e.valeur));
    await writeFile(chemin, doc.toString({ lineWidth: 0 }));
  }
  return originaux;
}

/** Remet les fichiers dans leur état d'origine. */
export async function restaurer(racine: string, originaux: Map<string, string>): Promise<void> {
  for (const [fichier, texte] of originaux) await writeFile(path.join(racine, fichier), texte);
}
