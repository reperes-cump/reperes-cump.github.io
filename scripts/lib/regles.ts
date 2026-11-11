import type { Affirmation, Verdict } from '../../schemas/index.ts';
import { signale } from '../../schemas/index.ts';
import {
  CHEMIN_DESIGNATIONS,
  CHEMIN_INFOS,
  type Contenu,
  cheminAffirmation,
  cheminSource,
  cheminVisuel,
  type Probleme,
} from './types.ts';

/** Verdicts d'une affirmation, avec les références de source qui les portent. */
function verdictsAvecSources(a: Affirmation): { verdict: Verdict; sources: string[] }[] {
  const tous = a.sources.map((reference) => reference.source_id);
  const resultat: { verdict: Verdict; sources: string[] }[] = [];
  if (a.verdict) resultat.push({ verdict: a.verdict, sources: tous });
  if (a.fusion) resultat.push({ verdict: a.fusion, sources: tous });
  if (a.verdicts) {
    for (const colonne of ['alerte', 'activation'] as const) {
      resultat.push({
        verdict: a.verdicts[colonne],
        sources: a.sources
          .filter((reference) => reference.porte_sur === colonne)
          .map((reference) => reference.source_id),
      });
    }
  }
  return resultat;
}

/** Contrôles entre fichiers, valables en brouillon comme en publication. */
export function verifierCoherence(contenu: Contenu): Probleme[] {
  const problemes: Probleme[] = [];
  const signaler = (fichier: string, message: string) => problemes.push({ fichier, message });

  const criteres = new Map<string, string>();
  for (const a of contenu.affirmations.values()) {
    const fichier = cheminAffirmation(a.id);

    for (const reference of a.sources) {
      if (!contenu.sources.has(reference.source_id)) {
        signaler(fichier, `source inconnue : ${reference.source_id}`);
      }
    }

    for (const { verdict, sources } of verdictsAvecSources(a)) {
      const tranche = verdict.valeur === 'recommande' || verdict.valeur === 'deconseille';
      const recommandationPro = sources.some(
        (id) => contenu.sources.get(id)?.autorite === 'recommandation_pro',
      );
      if (tranche && recommandationPro && !verdict.grade && !signale(a.a_relever, 'grade')) {
        signaler(fichier, 'grade obligatoire pour une recommandation professionnelle');
      }
    }

    for (const id of a.voir_aussi) {
      const cible = contenu.affirmations.get(id);
      if (!cible) signaler(fichier, `voir_aussi : affirmation inconnue : ${id}`);
      else if (cible.categorie === 'matrice') {
        signaler(fichier, `voir_aussi : ${id} est une ligne de matrice`);
      }
    }

    if (a.critere_explorateur) {
      const deja = criteres.get(a.critere_explorateur);
      if (deja) {
        signaler(
          fichier,
          `critère d’explorateur déjà utilisé par ${deja} : ${a.critere_explorateur}`,
        );
      }
      criteres.set(a.critere_explorateur, a.id);
    }
  }

  for (const [nom, visuel] of contenu.visuels) {
    const fichier = cheminVisuel(nom);
    const ids = new Set<string>();
    for (const element of visuel.elements) {
      if (ids.has(element.id)) signaler(fichier, `élément en double : ${element.id}`);
      ids.add(element.id);
      for (const id of element.affirmations) {
        if (!contenu.affirmations.has(id)) {
          signaler(fichier, `élément ${element.id} : affirmation inconnue : ${id}`);
        }
      }
    }
    for (const id of visuel.definitions) {
      if (!contenu.affirmations.has(id))
        signaler(fichier, `définition : affirmation inconnue : ${id}`);
    }
  }

  if (contenu.glossaire) {
    const fichier = cheminVisuel('glossaire');
    const ids = new Set<string>();
    for (const terme of contenu.glossaire.termes) {
      if (ids.has(terme.id)) signaler(fichier, `terme en double : ${terme.id}`);
      ids.add(terme.id);
      if (terme.definition && !contenu.affirmations.has(terme.definition)) {
        signaler(fichier, `${terme.id} : affirmation inconnue : ${terme.definition}`);
      }
      if (!terme.definition && !signale(terme.a_relever, 'définition')) {
        signaler(
          fichier,
          `${terme.id} : renvoyer vers une affirmation ou signaler « définition » à relever`,
        );
      }
    }
  }

  const designations = contenu.designations;
  if (designations) {
    const source = contenu.sources.get(designations.source_id);
    if (!source) {
      signaler(CHEMIN_DESIGNATIONS, `source inconnue : ${designations.source_id}`);
    } else {
      for (const annexe of designations.annexes) {
        const attendue = source.annexes.find((a) => a.numero === annexe.annexe);
        if (!attendue) {
          signaler(
            CHEMIN_DESIGNATIONS,
            `annexe ${annexe.annexe} absente de la source ${source.id}`,
          );
          continue;
        }
        if (attendue.designation !== annexe.designation) {
          signaler(
            CHEMIN_DESIGNATIONS,
            `annexe ${annexe.annexe} : désignation « ${annexe.designation} », la source indique « ${attendue.designation} »`,
          );
        }
        if (annexe.entrees.length !== attendue.nombre) {
          signaler(
            CHEMIN_DESIGNATIONS,
            `annexe ${annexe.annexe} : ${annexe.entrees.length} entrées, la source en indique ${attendue.nombre}`,
          );
        }
        const vus = new Set<string>();
        for (const entree of annexe.entrees) {
          if (vus.has(entree.departement)) {
            signaler(
              CHEMIN_DESIGNATIONS,
              `annexe ${annexe.annexe} : département en double : ${entree.departement}`,
            );
          }
          vus.add(entree.departement);
          if (contenu.departements && !contenu.departements.has(entree.departement)) {
            signaler(CHEMIN_DESIGNATIONS, `département absent du COG : ${entree.departement}`);
          }
        }
      }
      for (const attendue of source.annexes) {
        if (!designations.annexes.some((a) => a.annexe === attendue.numero)) {
          signaler(CHEMIN_DESIGNATIONS, `annexe ${attendue.numero} de la source non transcrite`);
        }
      }
    }
  }

  return problemes;
}

/** Contrôles supplémentaires du mode publication : tout doit être vérifié. */
export function verifierPublication(contenu: Contenu): Probleme[] {
  const problemes: Probleme[] = [];
  const signaler = (fichier: string, message: string) => problemes.push({ fichier, message });
  const mainteneur = contenu.infos?.mainteneur;

  if (!contenu.infos?.version) signaler(CHEMIN_INFOS, 'version du contenu non renseignée');
  if (!contenu.infos?.derniere_verification) {
    signaler(CHEMIN_INFOS, 'date de dernière vérification non renseignée');
  }

  const citees = new Set<string>();
  for (const a of contenu.affirmations.values()) {
    const fichier = cheminAffirmation(a.id);
    if (!a.verifie_le) signaler(fichier, 'non vérifiée (verifie_le vide)');
    else if (a.verifie_par !== mainteneur) {
      signaler(fichier, `verifie_par doit être ${mainteneur ?? 'le mainteneur'}`);
    }
    if (a.a_relever.length) signaler(fichier, `reste à relever : ${a.a_relever.join(', ')}`);
    for (const reference of a.sources) {
      citees.add(reference.source_id);
      const { page, article } = reference.localisation;
      if (page === null && article === null) {
        signaler(
          fichier,
          `${reference.source_id} : localisation imprécise (page ou article attendu)`,
        );
      }
    }
  }

  if (contenu.designations) {
    citees.add(contenu.designations.source_id);
    if (!contenu.designations.verifie_le)
      signaler(CHEMIN_DESIGNATIONS, 'désignations non vérifiées');
    else if (contenu.designations.verifie_par !== mainteneur) {
      signaler(CHEMIN_DESIGNATIONS, `verifie_par doit être ${mainteneur ?? 'le mainteneur'}`);
    }
  }
  if (!contenu.departements) {
    signaler('content/territoires/departements.yaml', 'liste des départements (COG) absente');
  }

  for (const id of citees) {
    const source = contenu.sources.get(id);
    if (!source) continue;
    if (source.statut === 'a_verifier') signaler(cheminSource(id), 'statut « à vérifier »');
    if (source.a_relever.length) {
      signaler(cheminSource(id), `reste à relever : ${source.a_relever.join(', ')}`);
    }
  }

  for (const terme of contenu.glossaire?.termes ?? []) {
    if (terme.a_relever.length) {
      signaler(
        cheminVisuel('glossaire'),
        `${terme.id} : reste à relever : ${terme.a_relever.join(', ')}`,
      );
    }
  }

  return problemes;
}

/** Tout ce qui reste à relever ou à vérifier, élément par élément : la feuille de route du mainteneur. */
export function listerARelever(contenu: Contenu): Probleme[] {
  const liste: Probleme[] = [];
  const noter = (fichier: string, manques: string[]) => {
    if (manques.length) liste.push({ fichier, message: manques.join(' ; ') });
  };

  if (contenu.infos) {
    noter(CHEMIN_INFOS, [
      ...(contenu.infos.version ? [] : ['version du contenu']),
      ...(contenu.infos.derniere_verification ? [] : ['date de dernière vérification']),
    ]);
  }

  for (const s of contenu.sources.values()) {
    noter(cheminSource(s.id), [
      ...(s.statut === 'a_verifier' ? ['statut'] : []),
      ...(s.url ? [] : ['URL']),
      ...(s.url_archive ? [] : ['archive']),
      ...(s.sha256 ? [] : ['empreinte']),
      ...(s.consulte_le ? [] : ['date de consultation']),
      ...s.a_relever,
    ]);
  }

  for (const a of contenu.affirmations.values()) {
    const sansLocalisation = a.sources
      .filter((r) => r.localisation.page === null && r.localisation.article === null)
      .map((r) => (r.porte_sur ? `${r.source_id} (${r.porte_sur})` : r.source_id));
    noter(cheminAffirmation(a.id), [
      ...(sansLocalisation.length
        ? [`page ou article : ${[...new Set(sansLocalisation)].join(', ')}`]
        : []),
      ...a.a_relever,
      ...(a.verifie_le ? [] : ['vérification']),
    ]);
  }

  for (const terme of contenu.glossaire?.termes ?? []) {
    if (terme.a_relever.length) {
      liste.push({
        fichier: cheminVisuel('glossaire'),
        message: `${terme.terme} : ${terme.a_relever.join(', ')}`,
      });
    }
  }

  if (contenu.designations) {
    const deduits = contenu.designations.annexes
      .flatMap((annexe) => annexe.entrees)
      .filter((entree) => entree.departement_deduit).length;
    noter(CHEMIN_DESIGNATIONS, [
      ...(deduits ? [`${deduits} départements déduits de la commune`] : []),
      ...(contenu.designations.verifie_le ? [] : ['vérification']),
    ]);
  }

  return liste;
}
