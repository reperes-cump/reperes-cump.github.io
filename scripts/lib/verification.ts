/**
 * Fiches de vérification du mainteneur.
 *
 * Claude prépare des propositions de relevé (page, article, extrait, lien) dans
 * sources-local/verification/propositions.yaml. Ce module en fait des fiches : ce que dit le
 * site, ce que dit le texte (retrouvé automatiquement dans le PDF quand il est disponible), et
 * la liste exacte des modifications qui seront écrites dans content/ si le mainteneur juge la
 * fiche conforme. Rien n'est écrit ici : l'écriture est faite par scripts/relecture-enregistrer.ts,
 * lancé par le mainteneur.
 */
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { date, identifiant } from '../../schemas/commun.ts';
import { type Affirmation, type Source, sourceSchema } from '../../schemas/index.ts';
import { estPdf } from '../../src/lib/affichage.ts';
import {
  colonnes,
  libellesDesignation,
  libellesGrade,
  libellesStatut,
  libellesVerdict,
} from '../../src/lib/libelles.ts';
import { chercherDansPage, chercherPartout, lisible } from './pdf.ts';
import { estLegifrance, localisationPrecise } from './regles.ts';
import { CHEMIN_DESIGNATIONS, CHEMIN_INFOS, CHEMIN_ZONES, type Contenu } from './types.ts';

// ——— Propositions préparées par Claude ———

const passageSchema = z.strictObject({
  /** Rang de la référence dans la liste `sources` de l'information (0 = la première). */
  ref: z.number().int().nonnegative(),
  source: identifiant,
  page: z.number().int().positive().optional(),
  article: z.string().min(1).optional(),
  annexe: z.string().min(1).optional(),
  section: z.string().min(1).optional(),
  lien: z.url({ protocol: /^https$/ }).optional(),
  /** Extrait littéral proposé pour le site (courte citation). */
  extrait: z.string().min(1).optional(),
  /** Phrases littérales qui précèdent l'extrait sur la page (titre de liste, etc.). */
  apres: z.array(z.string().min(1)).default([]),
  /** Citations relevées sur un texte en ligne (Légifrance, page web), à comparer sur place. */
  citations: z.array(z.string().min(1)).default([]),
  /** Mots cherchés dans tout le texte (pour vérifier une absence). */
  recherche: z.array(z.string().min(1)).default([]),
  remarque: z.string().min(1).optional(),
});

const texteSchema = z.strictObject({
  /** Champs de la fiche du texte à écrire (url, statut, consulte_le, reutilisation…). */
  champs: z.record(z.string(), z.string().nullable()).default({}),
  /** Ce qui restera « à relever » après confirmation (vide par défaut). */
  a_relever: z.array(z.string().min(1)).default([]),
  remarque: z.string().min(1).optional(),
  /** Décision à prendre avant de pouvoir confirmer : la fiche reste en attente. */
  attente: z.string().min(1).optional(),
});

export const propositionsSchema = z.strictObject({
  releve_le: date,
  textes: z.record(identifiant, texteSchema).default({}),
  informations: z
    .record(
      identifiant,
      z.strictObject({
        passages: z.array(passageSchema).default([]),
        /** Note publique proposée (par exemple pour expliquer un silence des textes). */
        note_publique: z.string().min(1).optional(),
        remarque: z.string().min(1).optional(),
        attente: z.string().min(1).optional(),
      }),
    )
    .default({}),
  /** Lien Légifrance de chaque annexe de l'arrêté (clé : numéro d'annexe). */
  designations: z
    .strictObject({
      liens: z.record(z.string(), z.url()).default({}),
      remarque: z.string().optional(),
    })
    .optional(),
  /** Lien Légifrance de chaque article du code de la défense (clé : numéro d'article). */
  zones: z
    .strictObject({
      liens: z.record(z.string(), z.url()).default({}),
      remarque: z.string().optional(),
    })
    .optional(),
  /** Version du contenu proposée pour la première publication. */
  version: z.string().min(1).optional(),
});

export type Propositions = z.output<typeof propositionsSchema>;
type PropositionPassage = z.output<typeof passageSchema>;

/** Texte d'une source disponible sur le poste du mainteneur. */
export interface TexteLocal {
  /** Chemin relatif au dossier de la feuille (sources-local/). */
  fichier: string;
  pages: string[];
  sha256: string;
}

// ——— Fiches ———

export type Valeur = string | number | null | string[];

/** Une modification d'un fichier YAML de content/ : chemin dans le document, nouvelle valeur. */
export interface Ecriture {
  fichier: string;
  chemin: (string | number)[];
  valeur: Valeur;
}

export type TypeFiche = 'texte' | 'information' | 'designations' | 'zones' | 'contenu';

export interface Fiche {
  id: string;
  type: TypeFiche;
  /** Texte auquel la fiche est rattachée, pour le sommaire. */
  groupe: string;
  titre: string;
  pret: boolean;
  /** Pourquoi la fiche n'est pas encore prête. */
  attente: string | null;
  ecritures: Ecriture[];
  /** Fichier qui reçoit verifie_le et verifie_par si la fiche est conforme. */
  verification: string | null;
  /** Ces fiches ne sont datées que lorsque toutes celles du même lot sont conformes. */
  lot: 'designations' | 'zones' | null;
  /** Corps HTML de la fiche (côté site, côté texte). */
  html: string;
  /** Ce qui sera enregistré, en clair. */
  resume: string[];
  signature: string;
  /** Date de vérification déjà inscrite dans content/. */
  deja: string | null;
}

export interface Groupe {
  id: string;
  titre: string;
}

// ——— Outils d'affichage ———

const echapper = (texte: string) =>
  texte
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const lien = (href: string, texte: string) =>
  `<a href="${echapper(href)}" target="_blank" rel="noreferrer">${echapper(texte)}</a>`;

const guillemets = (t: string) => `« ${t} »`;

const signer = (valeur: unknown) =>
  createHash('sha256').update(JSON.stringify(valeur)).digest('hex').slice(0, 16);

const cheminAffirmation = (id: string) => `content/affirmations/${id}.yaml`;
const cheminSource = (id: string) => `content/sources/${id}.yaml`;

/** Extrait de page avec le passage surligné ; les ancres sont soulignées. */
function contexteHtml(
  texte: string,
  trouve: { debut: number; fin: number; ancres: { debut: number; fin: number }[] },
  avant = 350,
  apres = 250,
): string {
  const marques = [
    ...trouve.ancres.map((a) => ({ ...a, classe: 'ancre' })),
    { debut: trouve.debut, fin: trouve.fin, classe: 'passage' },
  ].sort((a, b) => a.debut - b.debut);
  const premier = marques[0]?.debut ?? trouve.debut;
  let debut = Math.max(0, Math.min(premier, trouve.debut - avant));
  let fin = Math.min(texte.length, trouve.fin + apres);
  // Coupe sur un blanc pour ne pas trancher un mot.
  while (debut > 0 && !/\s/.test(texte[debut - 1] ?? '')) debut--;
  while (fin < texte.length && !/\s/.test(texte[fin] ?? '')) fin++;
  let html = debut > 0 ? '… ' : '';
  let curseur = debut;
  for (const m of marques) {
    if (m.debut < curseur) continue;
    html += echapper(lisible(texte.slice(curseur, m.debut)));
    html += `<mark class="${m.classe}">${echapper(lisible(texte.slice(m.debut, m.fin)))}</mark>`;
    curseur = m.fin;
  }
  html += echapper(lisible(texte.slice(curseur, fin)));
  return html + (fin < texte.length ? ' …' : '');
}

function pageEntiereHtml(texte: string, debut: number, fin: number): string {
  return `${echapper(lisible(texte.slice(0, debut)))}<mark class="passage">${echapper(
    lisible(texte.slice(debut, fin)),
  )}</mark>${echapper(lisible(texte.slice(fin)))}`;
}

function texteVerdict(v: NonNullable<Affirmation['verdict']> | null | undefined): string | null {
  if (!v) return null;
  const nom = v.libelle ?? libellesVerdict[v.valeur];
  const grade = v.grade ? libellesGrade[v.grade] : null;
  if (!nom) return grade ? `Grade : ${grade}` : null;
  return [nom, grade].filter(Boolean).join(', ');
}

/** Ce que le site affiche pour une information. */
function coteSite(a: Affirmation): string {
  const lignes: string[] = [];
  lignes.push(`<p class="enonce">${echapper(a.enonce ?? a.situation ?? '')}</p>`);
  if (a.fusion) {
    lignes.push(
      `<p class="verdict">Alerte et activation : ${echapper(texteVerdict(a.fusion) ?? '')}</p>`,
    );
  } else if (a.verdicts) {
    for (const c of ['alerte', 'activation'] as const) {
      lignes.push(
        `<p class="verdict">${echapper(colonnes[c].titre)} : ${echapper(texteVerdict(a.verdicts[c]) ?? '')}</p>`,
      );
    }
  } else {
    const v = texteVerdict(a.verdict);
    if (v) lignes.push(`<p class="verdict">${echapper(v)}</p>`);
  }
  if (a.note_publique)
    lignes.push(`<p class="note">Note affichée : ${echapper(a.note_publique)}</p>`);
  return lignes.join('\n');
}

const lieuLisible = (l: {
  page: number | null;
  article: string | null;
  annexe: string | null;
  section: string | null;
}) =>
  [
    l.article ? `article ${l.article}` : null,
    l.annexe ? `annexe ${l.annexe}` : null,
    l.page ? `page ${l.page}` : null,
    l.section ? `rubrique ${guillemets(l.section)}` : null,
  ]
    .filter(Boolean)
    .join(', ');

// ——— Construction ———

interface Entrees {
  contenu: Contenu;
  propositions: Propositions;
  textes: Map<string, TexteLocal>;
}

/** Fiche d'une information : chaque source citée, avec le passage retrouvé. */
function ficheInformation(a: Affirmation, { contenu, propositions, textes }: Entrees): Fiche {
  const props = propositions.informations[a.id];
  const fichier = cheminAffirmation(a.id);
  const ecritures: Ecriture[] = [];
  const resume: string[] = [];
  const manques: string[] = [];
  const blocs: string[] = [];

  a.sources.forEach((r, i) => {
    const p: PropositionPassage | undefined = props?.passages.find((x) => x.ref === i);
    const source = contenu.sources.get(r.source_id);
    if (!source) return;
    if (p && p.source !== r.source_id) {
      manques.push(`proposition n° ${i} : source ${p.source} au lieu de ${r.source_id}`);
      return;
    }
    const lieu = {
      page: p?.page ?? r.localisation.page,
      article: p?.article ?? r.localisation.article,
      annexe: p?.annexe ?? r.localisation.annexe,
      section: p?.section ?? r.localisation.section,
    };
    const extrait = p?.extrait ?? r.extrait;
    const lienProfond = p?.lien ?? r.lien_profond;
    const local = textes.get(source.id);
    const enLigne = Boolean(
      (lienProfond ?? source.url) &&
        (estLegifrance(lienProfond ?? source.url ?? '') || source.type === 'page_institutionnelle'),
    );

    const parties: string[] = [];
    let pret = true;
    let ouvrir: { href: string; texte: string } | null = null;

    if (local) {
      // Passage cherché dans le PDF : d'abord à la page proposée, sinon dans tout le texte.
      let trouve: ReturnType<typeof chercherDansPage> = null;
      let pageTrouvee: number | null = null;
      if (extrait) {
        const pages = lieu.page ? [lieu.page] : [];
        for (let n = 1; n <= local.pages.length; n++) if (n !== lieu.page) pages.push(n);
        for (const n of pages) {
          trouve = chercherDansPage(local.pages[n - 1] ?? '', extrait, p?.apres ?? []);
          if (trouve) {
            pageTrouvee = n;
            break;
          }
        }
        if (trouve && pageTrouvee) {
          if (lieu.page === null) {
            parties.push(
              `<p class="etat ok">Passage retrouvé dans le PDF, page ${pageTrouvee} (page ajoutée automatiquement).</p>`,
            );
            lieu.page = pageTrouvee;
          } else if (lieu.page !== pageTrouvee) {
            parties.push(
              `<p class="etat attention">Passage retrouvé page ${pageTrouvee} et non page ${lieu.page} : c'est la page ${pageTrouvee} qui sera enregistrée.</p>`,
            );
            lieu.page = pageTrouvee;
          } else {
            parties.push('<p class="etat ok">Passage retrouvé dans le PDF.</p>');
          }
          const texte = local.pages[pageTrouvee - 1] ?? '';
          parties.push(`<blockquote class="texte">${contexteHtml(texte, trouve)}</blockquote>`);
          parties.push(
            `<details class="page-entiere"><summary>Voir toute la page ${pageTrouvee}</summary><div class="texte">${pageEntiereHtml(texte, trouve.debut, trouve.fin)}</div></details>`,
          );
        } else {
          parties.push(
            '<p class="etat probleme">Passage introuvable dans le PDF : Claude doit corriger sa proposition.</p>',
          );
          pret = false;
          manques.push(`${source.libelle_court} : passage introuvable`);
        }
      } else if (!p?.recherche.length) {
        parties.push('<p class="etat probleme">Passage pas encore retrouvé par Claude.</p>');
        pret = false;
        manques.push(`${source.libelle_court} : passage à retrouver`);
      }
      if (lieu.page) {
        ouvrir = {
          href: `${local.fichier}#page=${lieu.page}`,
          texte: `Ouvrir le PDF à la page ${lieu.page}`,
        };
      }
    } else if (enLigne) {
      const adresse = lienProfond ?? source.url ?? '';
      ouvrir = {
        href: adresse,
        texte: estLegifrance(adresse) ? 'Ouvrir le texte sur Légifrance' : 'Ouvrir la page',
      };
      const citations = p?.citations.length ? p.citations : extrait ? [extrait] : [];
      if (citations.length) {
        parties.push(
          `<p class="etat en-ligne">Texte en ligne : citation relevée par Claude le ${echapper(propositions.releve_le)}, à comparer en ouvrant le lien.</p>`,
        );
        parties.push(
          `<blockquote class="texte">${citations.map((c) => `<p>${guillemets(echapper(c))}</p>`).join('')}</blockquote>`,
        );
      } else {
        parties.push('<p class="etat probleme">Passage pas encore relevé par Claude.</p>');
        pret = false;
        manques.push(`${source.libelle_court} : passage à relever`);
      }
    } else if (source.url && estPdf(source.url)) {
      parties.push(
        `<p class="etat probleme">Texte pas encore sur ton poste. Télécharge-le (${lien(source.url, 'ouvrir le PDF')}), enregistre-le sous <code>sources-local/textes/${echapper(source.id)}.pdf</code>, puis relance <code>npm run relecture</code>.</p>`,
      );
      pret = false;
      manques.push(`${source.libelle_court} : PDF à télécharger`);
    } else {
      parties.push('<p class="etat probleme">Aucun lien vers ce texte pour l\'instant.</p>');
      pret = false;
      manques.push(`${source.libelle_court} : lien du texte manquant`);
    }

    // Recherche de mots dans tout le texte (pour une absence).
    if (local && p?.recherche.length) {
      const lignes = p.recherche.map((mot) => {
        const occurrences = chercherPartout(local.pages, mot);
        if (!occurrences.length)
          return `<li>${guillemets(echapper(mot))} : aucune occurrence.</li>`;
        const details = occurrences
          .slice(0, 6)
          .map((o) => {
            const texte = local.pages[o.page - 1] ?? '';
            return `<li>page ${o.page} : ${contexteHtml(texte, { ...o, ancres: [] }, 90, 90)}</li>`;
          })
          .join('');
        return `<li>${guillemets(echapper(mot))} : ${occurrences.length} occurrence${occurrences.length > 1 ? 's' : ''}<ul>${details}</ul></li>`;
      });
      parties.push(
        `<div class="recherche"><p>Recherche dans tout le texte :</p><ul>${lignes.join('')}</ul></div>`,
      );
    }

    if (!localisationPrecise({ ...r, localisation: lieu }, source)) {
      pret = false;
      manques.push(`${source.libelle_court} : page ou article manquant`);
    }

    // Ce qui sera écrit pour cette référence.
    const base = ['sources', i];
    for (const champ of ['page', 'article', 'annexe', 'section'] as const) {
      if (lieu[champ] !== r.localisation[champ]) {
        ecritures.push({ fichier, chemin: [...base, 'localisation', champ], valeur: lieu[champ] });
      }
    }
    if (lienProfond !== r.lien_profond) {
      ecritures.push({ fichier, chemin: [...base, 'lien_profond'], valeur: lienProfond });
    }
    if (extrait !== r.extrait) {
      ecritures.push({ fichier, chemin: [...base, 'extrait'], valeur: extrait });
    }
    const lieuTexte = lieuLisible(lieu);
    resume.push(
      `${source.libelle_court} : ${lieuTexte || 'sans localisation'}${extrait ? `, extrait ${guillemets(extrait)}` : ''}`,
    );

    if (extrait) {
      parties.push(
        `<p class="publie"><span>Extrait qui sera affiché sur le site :</span> ${guillemets(echapper(extrait))}</p>`,
      );
    }
    if (p?.remarque) parties.push(`<p class="remarque">${echapper(p.remarque)}</p>`);
    if (ouvrir) parties.push(`<p class="ouvrir">${lien(ouvrir.href, ouvrir.texte)}</p>`);

    const colonne = r.porte_sur ? ` · ${colonnes[r.porte_sur].court}` : '';
    blocs.push(`<section class="passage${pret ? '' : ' incomplet'}">
  <h3>${echapper(source.libelle_court)}${echapper(colonne)}${lieuTexte ? ` · ${echapper(lieuTexte)}` : ''}</h3>
  ${parties.join('\n  ')}
</section>`);
  });

  // Un silence des textes s'accompagne d'une note qui l'explique : sans elle, rien à vérifier.
  const note = props?.note_publique ?? a.note_publique;
  const silence = [a.verdict, a.fusion, a.verdicts?.alerte, a.verdicts?.activation].some(
    (v) => v?.valeur === 'silence',
  );
  if (silence && !note) {
    manques.push(
      'il manque la note qui explique ce silence sur le site : propose-la à Claude, ou demande-lui d’en proposer une',
    );
  }
  if (props?.note_publique && props.note_publique !== a.note_publique) {
    ecritures.push({ fichier, chemin: ['note_publique'], valeur: props.note_publique });
    resume.push(`note affichée : ${guillemets(props.note_publique)}`);
  }
  if (a.a_relever.length) {
    ecritures.push({ fichier, chemin: ['a_relever'], valeur: [] });
  }
  if (props?.attente) manques.unshift(props.attente);

  const notes = a.a_relever.length
    ? `<div class="notes"><p>Points notés au moment du relevé :</p><ul>${a.a_relever.map((x) => `<li>${echapper(x)}</li>`).join('')}</ul></div>`
    : '';
  const remarque = props?.remarque ? `<p class="remarque">${echapper(props.remarque)}</p>` : '';
  const noteProposee =
    props?.note_publique && props.note_publique !== a.note_publique
      ? `<p class="note-proposee"><span>Note proposée par Claude, qui sera affichée sous la case :</span> ${echapper(props.note_publique)}</p>`
      : '';

  const html = `<div class="colonnes">
  <div class="cote-site"><h2>Ce que dit le site</h2>${coteSite(a)}${noteProposee}${notes}${remarque}</div>
  <div class="cote-texte"><h2>Ce que dit le texte</h2>${blocs.join('\n')}</div>
</div>`;

  return {
    id: `information:${a.id}`,
    type: 'information',
    groupe: a.sources[0]?.source_id ?? '',
    titre: a.enonce ?? a.situation ?? a.id,
    pret: manques.length === 0,
    attente: manques.length ? manques.join(' ; ') : null,
    ecritures,
    verification: fichier,
    lot: null,
    html,
    resume,
    signature: signer({
      ecritures,
      site: [a.enonce, a.situation, a.verdict, a.verdicts, a.fusion, a.note_publique, note],
    }),
    deja: a.verifie_le,
  };
}

const champsSource = [
  'url',
  'statut',
  'consulte_le',
  'reutilisation',
  'date_publication',
  'titre',
  'reference',
  'sha256',
] as const;

const libellesChamps: Record<string, string> = {
  url: 'Lien',
  statut: 'Statut',
  consulte_le: 'Consulté le',
  reutilisation: 'Réutilisation',
  date_publication: 'Date de publication',
  titre: 'Titre',
  reference: 'Référence',
  sha256: 'Empreinte du fichier',
  a_relever: 'Reste à relever',
};

const valeurLisible = (champ: string, valeur: Valeur | undefined): string => {
  if (valeur === null || valeur === undefined || (Array.isArray(valeur) && !valeur.length))
    return '—';
  if (Array.isArray(valeur)) return valeur.join(' ; ');
  if (champ === 'statut' && typeof valeur === 'string' && valeur in libellesStatut)
    return libellesStatut[valeur as Source['statut']];
  return String(valeur);
};

/** Fiche d'un texte : lien, statut, date de consultation, empreinte. */
function ficheTexte(source: Source, { propositions, textes }: Entrees): Fiche {
  const props = propositions.textes[source.id];
  const fichier = cheminSource(source.id);
  const local = textes.get(source.id);
  const lignes: { champ: string; actuel: Valeur; propose: Valeur }[] = [];
  const manques: string[] = [];

  const proposes: Record<string, Valeur> = { ...(props?.champs ?? {}) };
  if (local && local.sha256 !== source.sha256) proposes.sha256 = local.sha256;
  for (const champ of champsSource) {
    if (!(champ in proposes)) continue;
    const actuel = (source[champ] ?? null) as Valeur;
    if (proposes[champ] !== actuel)
      lignes.push({ champ, actuel, propose: proposes[champ] ?? null });
  }
  for (const champ of Object.keys(proposes)) {
    if (!(champsSource as readonly string[]).includes(champ))
      manques.push(`champ inconnu proposé : ${champ}`);
  }
  const resteARelever = props?.a_relever ?? [];
  if (JSON.stringify(resteARelever) !== JSON.stringify(source.a_relever)) {
    lignes.push({ champ: 'a_relever', actuel: source.a_relever, propose: resteARelever });
  }

  // La fiche modifiée doit rester valide.
  const fusion = { ...source, ...Object.fromEntries(lignes.map((l) => [l.champ, l.propose])) };
  const validation = sourceSchema.safeParse(fusion);
  if (!validation.success)
    manques.push(`proposition invalide : ${validation.error.issues[0]?.message}`);

  const url = (proposes.url as string | undefined) ?? source.url;
  const legifrance = url ? estLegifrance(url) : false;
  if (!local && url && estPdf(url) && !legifrance) {
    manques.push('PDF à télécharger');
  }
  if (props?.attente) manques.unshift(props.attente);

  const ecritures: Ecriture[] = lignes.map((l) => ({
    fichier,
    chemin: [l.champ],
    valeur: l.propose,
  }));

  const tableau = lignes.length
    ? `<table class="champs"><thead><tr><th scope="col">Champ</th><th scope="col">Aujourd'hui</th><th scope="col">Sera enregistré</th></tr></thead><tbody>${lignes
        .map(
          (l) =>
            `<tr><th scope="row">${echapper(libellesChamps[l.champ] ?? l.champ)}</th><td>${echapper(valeurLisible(l.champ, l.actuel))}</td><td><strong>${echapper(valeurLisible(l.champ, l.propose))}</strong></td></tr>`,
        )
        .join('')}</tbody></table>`
    : '<p>Rien à changer sur la fiche de ce texte.</p>';

  const aide = [
    url
      ? `<p class="ouvrir">${lien(url, legifrance ? 'Ouvrir le texte sur Légifrance' : 'Ouvrir le texte en ligne')}</p>`
      : '',
    local
      ? `<p class="ouvrir">${lien(local.fichier, 'Ouvrir le PDF enregistré sur ton poste')}</p>`
      : '',
    legifrance
      ? '<p class="note">Légifrance garde chaque version à sa propre adresse : pas besoin d’empreinte.</p>'
      : '',
    local && proposes.sha256
      ? '<p class="note">L’empreinte est calculée sur le PDF enregistré : elle prouve quelle version tu as lue.</p>'
      : '',
  ].join('');

  const html = `<div class="colonnes une">
  <div class="cote-texte">
    <h2>${echapper(source.titre)}</h2>
    <p class="note">À vérifier : c'est bien ce texte, il est toujours en vigueur, le lien mène au bon endroit.</p>
    ${tableau}
    ${props?.remarque ? `<p class="remarque">${echapper(props.remarque)}</p>` : ''}
    ${aide}
  </div>
</div>`;

  return {
    id: `texte:${source.id}`,
    type: 'texte',
    groupe: source.id,
    titre: `Le texte : ${source.libelle_court}`,
    pret: manques.length === 0,
    attente: manques.length ? manques.join(' ; ') : null,
    ecritures,
    verification: null,
    lot: null,
    html,
    resume: lignes.map(
      (l) => `${libellesChamps[l.champ] ?? l.champ} : ${valeurLisible(l.champ, l.propose)}`,
    ),
    signature: signer({ ecritures, titre: source.titre }),
    deja: source.statut !== 'a_verifier' && !source.a_relever.length ? 'fait' : null,
  };
}

/** Fiches de la carte : une par annexe de l'arrêté, une par article du code de la défense. */
function fichesCarte({ contenu, propositions }: Entrees): Fiche[] {
  const fiches: Fiche[] = [];
  const noms = new Map(contenu.referentiel?.departements.map((d) => [d.code, d.nom]) ?? []);
  const d = contenu.designations;
  if (d) {
    for (const annexe of d.annexes) {
      const url = propositions.designations?.liens[annexe.annexe];
      const lignes = annexe.entrees
        .map(
          (e) =>
            `<tr><td>${echapper(e.territoire)}</td><td>${echapper(e.etablissement)}</td><td>${echapper(noms.get(e.departement) ?? '')} (${echapper(e.departement)})${e.departement_deduit ? ' <span class="deduit">déduit de la ville</span>' : ''}</td></tr>`,
        )
        .join('');
      const html = `<div class="colonnes une"><div class="cote-texte">
  <h2>Annexe ${echapper(annexe.annexe)} : ${echapper(libellesDesignation[annexe.designation])}</h2>
  <p class="note">À vérifier : la liste du site est identique à l'annexe (mêmes territoires, mêmes établissements). « Déduit de la ville » : le texte ne donne pas le département, le site l'a déduit de la ville de l'établissement.</p>
  ${url ? `<p class="ouvrir">${lien(url, `Ouvrir l'annexe ${annexe.annexe} sur Légifrance`)}</p>` : ''}
  <table class="champs"><thead><tr><th scope="col">Territoire</th><th scope="col">Établissement</th><th scope="col">Département</th></tr></thead><tbody>${lignes}</tbody></table>
  ${propositions.designations?.remarque ? `<p class="remarque">${echapper(propositions.designations.remarque)}</p>` : ''}
</div></div>`;
      fiches.push({
        id: `designations:${annexe.annexe}`,
        type: 'designations',
        groupe: d.source_id,
        titre: `Carte : annexe ${annexe.annexe} (${annexe.entrees.length} ${libellesDesignation[annexe.designation]})`,
        pret: Boolean(url),
        attente: url ? null : 'lien de l’annexe à relever',
        ecritures: [],
        verification: CHEMIN_DESIGNATIONS,
        lot: 'designations',
        html,
        resume: [`${annexe.entrees.length} lignes conformes à l'annexe ${annexe.annexe}`],
        signature: signer(annexe),
        deja: d.verifie_le,
      });
    }
  }

  const z = contenu.zones;
  if (z) {
    const articles = [...new Set(z.zones.map((zone) => zone.article))];
    for (const article of articles) {
      const url = propositions.zones?.liens[article];
      const zones = z.zones.filter((zone) => zone.article === article);
      const html = `<div class="colonnes une"><div class="cote-texte">
  <h2>Code de la défense, article ${echapper(article)}</h2>
  <p class="note">À vérifier : chaque zone contient exactement ces départements, écrits comme dans l'article.</p>
  ${url ? `<p class="ouvrir">${lien(url, `Ouvrir l'article ${article} sur Légifrance`)}</p>` : ''}
  <table class="champs"><thead><tr><th scope="col">Zone</th><th scope="col">Départements</th></tr></thead><tbody>${zones
    .map(
      (zone) =>
        `<tr><th scope="row">${echapper(zone.nom)}</th><td>${echapper([...zone.departements, ...zone.autres_territoires].join(', '))}</td></tr>`,
    )
    .join('')}</tbody></table>
  ${propositions.zones?.remarque ? `<p class="remarque">${echapper(propositions.zones.remarque)}</p>` : ''}
</div></div>`;
      fiches.push({
        id: `zones:${article}`,
        type: 'zones',
        groupe: z.source_id,
        titre: `Carte : zones de l'article ${article}`,
        pret: Boolean(url),
        attente: url ? null : 'lien de l’article à relever',
        ecritures: [],
        verification: CHEMIN_ZONES,
        lot: 'zones',
        html,
        resume: [`${zones.length} zones conformes à l'article ${article}`],
        signature: signer(zones),
        deja: z.verifie_le,
      });
    }
  }
  return fiches;
}

function ficheContenu({ contenu, propositions }: Entrees): Fiche {
  const version = propositions.version ?? '1.0.0';
  const infos = contenu.infos;
  const ecritures: Ecriture[] =
    infos?.version === version
      ? []
      : [{ fichier: CHEMIN_INFOS, chemin: ['version'], valeur: version }];
  const html = `<div class="colonnes une"><div class="cote-texte">
  <h2>Version du contenu</h2>
  <p>À confirmer en dernier, une fois tout le reste vérifié.</p>
  <table class="champs"><tbody>
    <tr><th scope="row">Version</th><td>${echapper(infos?.version ?? '—')}</td><td><strong>${echapper(version)}</strong></td></tr>
    <tr><th scope="row">Dernière vérification</th><td>${echapper(infos?.derniere_verification ?? '—')}</td><td><strong>date de ton clic</strong></td></tr>
  </tbody></table>
</div></div>`;
  return {
    id: 'contenu',
    type: 'contenu',
    groupe: 'contenu',
    titre: 'Version du contenu',
    pret: true,
    attente: null,
    ecritures,
    verification: null,
    lot: null,
    html,
    resume: [`version ${version}`, 'date de dernière vérification : date de ton clic'],
    signature: signer({ ecritures }),
    deja: infos?.derniere_verification ?? null,
  };
}

/** Toutes les fiches, dans l'ordre de passage : texte par texte, puis la carte, puis la version. */
export function preparerFiches(entrees: Entrees): { fiches: Fiche[]; groupes: Groupe[] } {
  const { contenu, propositions } = entrees;
  const affirmations = [...contenu.affirmations.values()];

  // Textes à vérifier : cités par une information, par la carte, ou ayant une proposition.
  const utiles = new Set<string>([
    ...affirmations.flatMap((a) => a.sources.map((r) => r.source_id)),
    ...Object.keys(propositions.textes),
  ]);
  for (const id of [
    contenu.designations?.source_id,
    contenu.zones?.source_id,
    contenu.referentiel?.source_id,
  ]) {
    if (id) utiles.add(id);
  }

  const infos = affirmations.map((a) => ficheInformation(a, entrees));
  const premierePage = (f: Fiche) => {
    const a = contenu.affirmations.get(f.id.replace('information:', ''));
    const r = a?.sources.find((s) => s.source_id === f.groupe);
    const p = propositions.informations[a?.id ?? '']?.passages.find((x) => x.source === f.groupe);
    return p?.page ?? r?.localisation.page ?? Number.POSITIVE_INFINITY;
  };

  const nombre = (id: string) => infos.filter((f) => f.groupe === id).length;
  const ordre = [...utiles]
    .filter((id) => contenu.sources.has(id))
    .sort((a, b) => nombre(b) - nombre(a) || a.localeCompare(b));

  const fiches: Fiche[] = [];
  const groupes: Groupe[] = [];
  for (const id of ordre) {
    const source = contenu.sources.get(id);
    if (!source) continue;
    groupes.push({ id, titre: source.libelle_court });
    fiches.push(ficheTexte(source, entrees));
    fiches.push(
      ...infos
        .filter((f) => f.groupe === id)
        .sort((a, b) => premierePage(a) - premierePage(b) || a.id.localeCompare(b.id)),
    );
  }
  const carte = fichesCarte(entrees);
  if (carte.length) {
    groupes.push({ id: 'carte', titre: 'Carte des CUMP' });
    fiches.push(...carte.map((f) => ({ ...f, groupe: 'carte' })));
  }
  groupes.push({ id: 'contenu', titre: 'Pour finir' });
  fiches.push(ficheContenu(entrees));
  return { fiches, groupes };
}
