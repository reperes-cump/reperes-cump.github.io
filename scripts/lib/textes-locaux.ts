/**
 * Tout ce qu'il faut pour préparer les fiches de vérification : le contenu, les propositions
 * de Claude et les textes enregistrés sur le poste du mainteneur (dossier sources-local/).
 */
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { chargerContenu } from './contenu.ts';
import { existe, lireYaml } from './lecture.ts';
import { lirePdf } from './pdf.ts';
import type { Contenu } from './types.ts';
import {
  type Fiche,
  type Groupe,
  type Propositions,
  preparerFiches,
  propositionsSchema,
  type TexteLocal,
} from './verification.ts';

export const DOSSIER_LOCAL = 'sources-local';
export const CHEMIN_PROPOSITIONS = `${DOSSIER_LOCAL}/verification/propositions.yaml`;

async function empreinte(fichier: string): Promise<string> {
  const hachage = createHash('sha256');
  for await (const morceau of createReadStream(fichier)) hachage.update(morceau);
  return hachage.digest('hex');
}

/** Les PDF de sources-local/ reliés à leur source : par nom (<id>.pdf) ou par empreinte. */
async function textesLocaux(racine: string, contenu: Contenu): Promise<Map<string, TexteLocal>> {
  const dossier = path.join(racine, DOSSIER_LOCAL);
  let noms: string[] = [];
  try {
    noms = (await readdir(dossier, { recursive: true })).filter((n) =>
      n.toLowerCase().endsWith('.pdf'),
    );
  } catch {
    return new Map();
  }
  const pdf = await Promise.all(
    noms.map(async (n) => ({
      fichier: n.split(path.sep).join('/'),
      sha256: await empreinte(path.join(dossier, n)),
    })),
  );
  const textes = new Map<string, TexteLocal>();
  for (const source of contenu.sources.values()) {
    const trouve =
      pdf.find((f) => path.posix.basename(f.fichier, '.pdf') === source.id) ??
      (source.sha256 ? pdf.find((f) => f.sha256 === source.sha256) : undefined);
    if (!trouve) continue;
    textes.set(source.id, {
      fichier: trouve.fichier,
      sha256: trouve.sha256,
      pages: await lirePdf(path.join(dossier, trouve.fichier)),
    });
  }
  return textes;
}

export interface Verification {
  contenu: Contenu;
  propositions: Propositions;
  textes: Map<string, TexteLocal>;
  fiches: Fiche[];
  groupes: Groupe[];
}

/** Charge tout et prépare les fiches. Échoue si le contenu ou les propositions sont invalides. */
export async function chargerVerification(racine: string): Promise<Verification> {
  const { contenu, erreurs } = await chargerContenu(racine);
  if (erreurs.length) {
    throw new Error(`le contenu a ${erreurs.length} erreur(s) : lancer d'abord npm run validate`);
  }
  let propositions: Propositions = propositionsSchema.parse({
    releve_le: new Date().toISOString().slice(0, 10),
  });
  if (await existe(racine, CHEMIN_PROPOSITIONS)) {
    const fichier = await lireYaml(racine, CHEMIN_PROPOSITIONS);
    if (fichier.erreurs.length) throw new Error(`${CHEMIN_PROPOSITIONS} : ${fichier.erreurs[0]}`);
    const resultat = propositionsSchema.safeParse(fichier.donnees);
    if (!resultat.success) {
      const issue = resultat.error.issues[0];
      throw new Error(
        `${CHEMIN_PROPOSITIONS} : ${issue?.path.join('.')} : ${issue?.message ?? 'invalide'}`,
      );
    }
    propositions = resultat.data;
  }
  const textes = await textesLocaux(racine, contenu);
  const { fiches, groupes } = preparerFiches({ contenu, propositions, textes });
  return { contenu, propositions, textes, fiches, groupes };
}
