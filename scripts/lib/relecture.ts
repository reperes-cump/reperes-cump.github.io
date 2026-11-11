/**
 * Page de vérification du mainteneur (sources-local/relecture.html) : une fiche à la fois,
 * « Conforme » ou « À revoir », progression gardée dans le navigateur, puis export des choix
 * dans un fichier que `npm run relecture:enregistrer` reporte dans content/.
 */
import type { Fiche, Groupe } from './verification.ts';

/** Titre court : le texte complet figure dans la fiche. */
const court = (texte: string, max = 90) => {
  if (texte.length <= max) return texte;
  const coupe = texte.slice(0, max);
  return `${coupe.slice(0, coupe.lastIndexOf(' '))} …`;
};

const echapper = (texte: string) =>
  texte
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

/** Préfixe des fichiers exportés, cherché ensuite dans Téléchargements. */
export const PREFIXE_EXPORT = 'reperes-cump-verifications';

export function pageDeVerification(
  fiches: Fiche[],
  groupes: Groupe[],
  { date, mainteneur }: { date: string; mainteneur: string },
): string {
  const donnees = fiches.map((f) => ({
    id: f.id,
    signature: f.signature,
    pret: f.pret,
    deja: Boolean(f.deja),
    groupe: f.groupe,
  }));
  const aFaire = fiches.filter((f) => !f.deja).length;

  const sommaire = groupes
    .map((g) => {
      const liste = fiches
        .map((f, i) => ({ f, i }))
        .filter(({ f }) => f.groupe === g.id)
        .map(
          ({ f, i }) =>
            `<li><button type="button" data-aller="${i}"><span class="pastille" data-etat-de="${echapper(f.id)}" aria-hidden="true"></span><span class="libelle">${echapper(f.titre)}</span></button></li>`,
        )
        .join('');
      return `<li class="groupe"><details open><summary>${echapper(g.titre)}</summary><ol>${liste}</ol></details></li>`;
    })
    .join('');

  const sections = fiches
    .map(
      (f, i) => `<article class="fiche" id="fiche-${i}" data-index="${i}" hidden>
  <header class="fiche-tete">
    <p class="fiche-rang">Fiche ${i + 1} sur ${fiches.length}</p>
    <h1>${echapper(court(f.titre))}</h1>
    ${f.deja ? '<p class="bandeau deja">Déjà vérifiée : rien à faire, sauf si tu veux la revoir.</p>' : ''}
    ${!f.pret ? `<p class="bandeau attente"><strong>Pas encore prête.</strong> ${echapper(f.attente ?? '')}</p>` : ''}
  </header>
  ${f.html}
  <footer class="fiche-pied">
    ${
      f.pret
        ? `<div class="enregistre"><p>Si tu cliques sur <strong>Conforme</strong>, j'enregistre :</p><ul>${[
            ...f.resume,
            ...(f.verification
              ? [
                  f.lot
                    ? `vérifié par ${mainteneur}, à la date de ton clic, une fois toutes les fiches de la carte conformes`
                    : `vérifié par ${mainteneur}, à la date de ton clic`,
                ]
              : []),
          ]
            .map((r) => `<li>${echapper(r)}</li>`)
            .join('')}</ul></div>`
        : ''
    }
    <div class="decision">
      <button type="button" class="bouton conforme" data-choix="conforme" ${f.pret ? '' : 'disabled'}>Conforme <kbd>C</kbd></button>
      <button type="button" class="bouton revoir" data-choix="a-revoir">À revoir <kbd>R</kbd></button>
      <button type="button" class="bouton passer" data-passer>Passer <kbd>→</kbd></button>
    </div>
    <div class="note-revoir" data-note hidden>
      <label for="note-${i}">Qu'est-ce qui ne va pas ? Une phrase suffit.</label>
      <textarea id="note-${i}" rows="3"></textarea>
      <button type="button" class="bouton revoir" data-noter>Noter et passer à la suivante</button>
    </div>
    <p class="etat-decision" data-etat aria-live="polite"></p>
  </footer>
</article>`,
    )
    .join('\n');

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Vérification | Repères CUMP</title>
<link rel="icon" href="data:,">
<style>
  :root { color-scheme: light; --encre: #1c2b3a; --encre-2: #4a5866; --papier: #fbfcfd; --papier-2: #eef2f5; --filet: #c9d2db; --surligneur: #fff1b8; --ok: #1d6b3a; --ok-fond: #e3f3e8; --revoir: #8a3b00; --revoir-fond: #fdeee3; --attente: #5b4a00; --attente-fond: #fbf3cf; --accent: #1f5fa8; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--papier); color: var(--encre); font: 16px/1.55 system-ui, -apple-system, sans-serif; }
  .barre { position: sticky; top: 0; z-index: 2; display: flex; flex-wrap: wrap; align-items: center; gap: .75rem 1.5rem; padding: .75rem 1.25rem; background: var(--encre); color: var(--papier); }
  .barre h2 { margin: 0; font-size: 1rem; }
  .progression { flex: 1 1 14rem; display: flex; align-items: center; gap: .75rem; }
  .progression progress { flex: 1; height: .6rem; accent-color: #7fd39b; }
  .barre button { padding: .45rem .9rem; border: 0; border-radius: 6px; background: var(--papier); color: var(--encre); font: inherit; font-weight: 650; cursor: pointer; }
  .mise-en-page { display: grid; grid-template-columns: minmax(15rem, 22rem) minmax(0, 1fr); min-height: calc(100vh - 3.5rem); }
  nav.sommaire { padding: 1rem; border-right: 1px solid var(--filet); background: var(--papier-2); font-size: .88rem; overflow-y: auto; max-height: calc(100vh - 3.5rem); position: sticky; top: 3.5rem; }
  nav ol, nav > ul { margin: 0; padding: 0; list-style: none; }
  nav summary { font-weight: 700; cursor: pointer; margin: .75rem 0 .25rem; }
  nav button { display: flex; gap: .5rem; align-items: baseline; width: 100%; padding: .25rem .4rem; border: 0; border-radius: 4px; background: none; color: inherit; font: inherit; text-align: start; cursor: pointer; }
  nav button:hover, nav button[aria-current="true"] { background: var(--papier); }
  nav button[aria-current="true"] { outline: 2px solid var(--accent); }
  .libelle { overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  .pastille { flex: none; width: .75rem; height: .75rem; border-radius: 50%; border: 2px solid var(--encre-2); transform: translateY(.1rem); }
  .pastille[data-etat="conforme"], .pastille[data-etat="deja"] { background: var(--ok); border-color: var(--ok); }
  .pastille[data-etat="a-revoir"] { background: var(--revoir); border-color: var(--revoir); }
  .pastille[data-etat="attente"] { border-style: dotted; }
  main { padding: 1.5rem clamp(1rem, 3vw, 2.5rem) 4rem; max-width: 92rem; }
  .accueil { margin-bottom: 1.5rem; padding: 1rem 1.25rem; border-radius: 8px; background: var(--papier-2); }
  .accueil h1 { margin: 0 0 .5rem; font-size: 1.3rem; }
  .accueil ol { margin: .25rem 0 0; padding-inline-start: 1.25rem; }
  .fiche-rang { margin: 0; color: var(--encre-2); font-size: .9rem; }
  .fiche h1 { margin: .15rem 0 .75rem; font-size: 1.35rem; line-height: 1.3; }
  .bandeau { margin: 0 0 1rem; padding: .6rem .9rem; border-radius: 6px; }
  .bandeau.deja { background: var(--ok-fond); color: var(--ok); }
  .bandeau.attente { background: var(--attente-fond); color: var(--attente); }
  .colonnes { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 3fr); gap: 1.5rem; }
  .colonnes.une { grid-template-columns: minmax(0, 1fr); }
  .cote-site, .cote-texte { min-width: 0; }
  .cote-site { padding: 1rem 1.25rem; border-radius: 8px; background: var(--papier-2); align-self: start; }
  .colonnes h2 { margin: 0 0 .5rem; font-size: .8rem; letter-spacing: .06em; text-transform: uppercase; color: var(--encre-2); }
  .enonce { margin: 0 0 .5rem; font-size: 1.15rem; font-weight: 600; }
  .verdict { margin: .2rem 0; font-weight: 650; }
  .note { color: var(--encre-2); font-size: .92rem; }
  .notes { margin-top: 1rem; font-size: .9rem; color: var(--encre-2); }
  .notes ul { margin: .25rem 0 0; padding-inline-start: 1.1rem; }
  .note-proposee { margin: .75rem 0; padding: .6rem .8rem; border: 2px dashed var(--accent); border-radius: 6px; background: #fff; }
  .note-proposee span { display: block; color: var(--accent); font-size: .85rem; font-weight: 650; }
  .remarque { margin: .75rem 0; padding: .6rem .8rem; border-left: 4px solid var(--revoir); background: var(--revoir-fond); }
  .remarque::before { content: "À regarder : "; font-weight: 700; }
  .passage { margin-bottom: 1.25rem; padding-bottom: 1rem; border-bottom: 1px solid var(--filet); }
  .passage h3 { margin: 0 0 .4rem; font-size: 1rem; }
  .etat { margin: .25rem 0 .5rem; font-size: .92rem; font-weight: 600; }
  .etat.ok { color: var(--ok); } .etat.ok::before { content: "✓ "; }
  .etat.attention { color: var(--revoir); }
  .etat.probleme { color: var(--attente); }
  .etat.en-ligne { color: var(--accent); }
  .texte { margin: .5rem 0; padding: .75rem 1rem; border-left: 3px solid var(--filet); background: #fff; font-family: Georgia, "Times New Roman", serif; font-size: 1.02rem; line-height: 1.6; }
  .texte p { margin: 0 0 .4rem; }
  mark.passage { background: var(--surligneur); padding: .05em .1em; border-radius: 2px; }
  mark.ancre { background: none; text-decoration: underline 2px var(--accent); text-underline-offset: 3px; }
  details.page-entiere summary { cursor: pointer; color: var(--accent); font-size: .9rem; }
  .publie { margin: .5rem 0; font-size: .95rem; } .publie span { color: var(--encre-2); }
  .ouvrir { margin: .4rem 0; } .ouvrir a { font-weight: 650; color: var(--accent); }
  .recherche { font-size: .92rem; } .recherche ul { margin: .25rem 0; padding-inline-start: 1.1rem; }
  table.champs { width: 100%; border-collapse: collapse; margin: .5rem 0 1rem; font-size: .95rem; }
  table.champs th, table.champs td { padding: .45rem .6rem; border-bottom: 1px solid var(--filet); text-align: start; vertical-align: top; overflow-wrap: anywhere; }
  .deduit { display: inline-block; padding: 0 .4rem; border-radius: 4px; background: var(--attente-fond); color: var(--attente); font-size: .8rem; }
  [hidden] { display: none !important; }
  .fiche-pied { margin-top: 1.5rem; padding: 1rem 0; border-top: 2px solid var(--encre); background: var(--papier); }
  @media (min-height: 50rem) { .fiche-pied { position: sticky; bottom: 0; } }
  .enregistre { font-size: .9rem; color: var(--encre-2); } .enregistre p { margin: 0; } .enregistre ul { margin: .2rem 0 .75rem; padding-inline-start: 1.1rem; }
  .decision { display: flex; flex-wrap: wrap; gap: .75rem; }
  .bouton { min-height: 3rem; padding: .6rem 1.4rem; border: 2px solid currentColor; border-radius: 8px; background: #fff; font: inherit; font-size: 1.05rem; font-weight: 700; cursor: pointer; }
  .bouton kbd { margin-inline-start: .4rem; padding: 0 .35rem; border: 1px solid currentColor; border-radius: 4px; font-size: .8rem; opacity: .7; }
  .bouton.conforme { color: #fff; background: var(--ok); border-color: var(--ok); }
  .bouton.revoir { color: var(--revoir); }
  .bouton.passer { color: var(--encre-2); }
  .bouton:disabled { opacity: .35; cursor: not-allowed; }
  .note-revoir { display: grid; gap: .5rem; margin-top: .75rem; max-width: 40rem; }
  .note-revoir textarea { font: inherit; padding: .5rem; border: 2px solid var(--revoir); border-radius: 6px; }
  .etat-decision { margin: .5rem 0 0; font-weight: 650; }
  .fenetre { position: fixed; inset: 0; z-index: 5; display: grid; place-items: center; background: rgb(28 43 58 / .5); }
  .fenetre[hidden] { display: none; }
  .fenetre > div { max-width: 34rem; margin: 1rem; padding: 1.5rem; border-radius: 10px; background: var(--papier); }
  .fenetre code { display: block; margin: .5rem 0; padding: .6rem .8rem; border-radius: 6px; background: var(--encre); color: var(--papier); font-size: 1rem; }
  :focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
  @media (width < 60rem) { .mise-en-page { grid-template-columns: 1fr; } nav.sommaire { position: static; max-height: 16rem; border-right: 0; border-bottom: 1px solid var(--filet); } .colonnes { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<div class="barre">
  <h2>Vérification de Repères CUMP</h2>
  <div class="progression"><progress max="${aFaire}" value="0" data-progression></progress><span data-compte></span></div>
  <button type="button" data-exporter>Enregistrer mes vérifications</button>
</div>
<div class="mise-en-page">
  <nav class="sommaire" aria-label="Fiches"><ul>${sommaire}</ul></nav>
  <main>
    <section class="accueil">
      <h1>Comment faire</h1>
      <ol>
        <li>Lis la fiche : à gauche ce que dit le site, à droite ce que dit le texte (le passage est surligné en jaune).</li>
        <li>Si c'est la même chose : <strong>Conforme</strong>. Sinon : <strong>À revoir</strong>, avec une phrase pour dire pourquoi.</li>
        <li>Quand tu fais une pause : <strong>Enregistrer mes vérifications</strong>, en haut à droite, puis la commande indiquée.</li>
      </ol>
      <p class="note">Ta progression reste dans ce navigateur : tu peux fermer la page et revenir plus tard. Feuille préparée le ${echapper(date)}.</p>
    </section>
    ${sections}
  </main>
</div>
<div class="fenetre" data-fenetre hidden role="dialog" aria-modal="true" aria-labelledby="fenetre-titre">
  <div>
    <h2 id="fenetre-titre">Presque fini</h2>
    <p>Le fichier de tes choix vient d'arriver dans tes Téléchargements. Pour les reporter dans le site, lance dans le terminal du projet :</p>
    <code>npm run relecture:enregistrer</code>
    <p class="note">Seules les fiches « Conforme » sont enregistrées comme vérifiées. Les fiches « À revoir » sont notées pour Claude.</p>
    <button type="button" class="bouton passer" data-fermer>Fermer</button>
  </div>
</div>
<script>
  const FICHES = ${JSON.stringify(donnees)};
  const CLE = 'reperes-cump:verification';
  let choix = {};
  try { choix = JSON.parse(localStorage.getItem(CLE) || '{}'); } catch {}
  // Une fiche modifiée depuis le choix doit être revue : son choix est oublié.
  for (const f of FICHES) if (choix[f.id] && choix[f.id].signature !== f.signature) delete choix[f.id];
  const sauver = () => { try { localStorage.setItem(CLE, JSON.stringify(choix)); } catch {} };

  const articles = [...document.querySelectorAll('article.fiche')];
  const boutonsSommaire = [...document.querySelectorAll('[data-aller]')];
  let courante = 0;

  const etat = (f) => choix[f.id]?.decision ?? (f.deja ? 'deja' : f.pret ? 'a-faire' : 'attente');
  const libelles = { conforme: 'Conforme : sera enregistrée.', 'a-revoir': 'À revoir : notée pour Claude.' };

  function rafraichir() {
    for (const f of FICHES) {
      const p = document.querySelector('[data-etat-de="' + CSS.escape(f.id) + '"]');
      if (p) p.dataset.etat = etat(f);
    }
    const faites = FICHES.filter((f) => !f.deja && choix[f.id]).length;
    const total = FICHES.filter((f) => !f.deja).length;
    document.querySelector('[data-progression]').value = faites;
    document.querySelector('[data-compte]').textContent = faites + ' sur ' + total + ' fiches';
    const f = FICHES[courante];
    const zone = articles[courante].querySelector('[data-etat]');
    const c = choix[f.id];
    zone.textContent = c ? libelles[c.decision] + (c.note ? ' « ' + c.note + ' »' : '') : '';
  }

  function montrer(i) {
    courante = Math.max(0, Math.min(articles.length - 1, i));
    articles.forEach((a, n) => { a.hidden = n !== courante; });
    document.querySelector('.accueil').hidden = courante !== 0;
    boutonsSommaire.forEach((b, n) => b.setAttribute('aria-current', String(n === courante)));
    boutonsSommaire[courante]?.scrollIntoView({ block: 'nearest' });
    window.scrollTo({ top: 0 });
    try { localStorage.setItem(CLE + ':courante', String(courante)); } catch {}
    rafraichir();
  }

  function suivante() {
    const n = FICHES.findIndex((f, i) => i > courante && !f.deja && !choix[f.id]);
    montrer(n === -1 ? courante + 1 : n);
  }

  function decider(decision, note) {
    const f = FICHES[courante];
    if (decision === 'conforme' && !f.pret) return;
    choix[f.id] = { decision, note: note || '', date: new Date().toISOString().slice(0, 10), signature: f.signature };
    sauver();
    rafraichir();
    setTimeout(suivante, 250);
  }

  document.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.aller) montrer(Number(t.dataset.aller));
    if (t.dataset.choix === 'conforme') decider('conforme');
    if (t.dataset.choix === 'a-revoir') {
      const zone = articles[courante].querySelector('[data-note]');
      zone.hidden = false;
      zone.querySelector('textarea').focus();
    }
    if ('noter' in t.dataset) {
      const texte = articles[courante].querySelector('textarea').value.trim();
      articles[courante].querySelector('[data-note]').hidden = true;
      decider('a-revoir', texte);
    }
    if ('passer' in t.dataset) montrer(courante + 1);
    if ('exporter' in t.dataset) exporter();
    if ('fermer' in t.dataset) document.querySelector('[data-fenetre]').hidden = true;
  });

  document.addEventListener('keydown', (e) => {
    if (e.target.closest('textarea, input') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'c' || e.key === 'C') decider('conforme');
    else if (e.key === 'r' || e.key === 'R') articles[courante].querySelector('[data-choix="a-revoir"]').click();
    else if (e.key === 'ArrowRight') montrer(courante + 1);
    else if (e.key === 'ArrowLeft') montrer(courante - 1);
    else return;
    e.preventDefault();
  });

  function exporter() {
    const decisions = Object.entries(choix).map(([id, c]) => ({ id, ...c }));
    const contenu = JSON.stringify({ format: '${PREFIXE_EXPORT}', version: 1, exporte_le: new Date().toISOString(), decisions }, null, 2);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([contenu], { type: 'application/json' }));
    a.download = '${PREFIXE_EXPORT}-' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
    document.querySelector('[data-fenetre]').hidden = false;
  }

  let depart = 0;
  try { depart = Number(localStorage.getItem(CLE + ':courante') || 0); } catch {}
  if (!(depart >= 0 && depart < articles.length)) depart = 0;
  montrer(depart);
</script>
</body>
</html>
`;
}
