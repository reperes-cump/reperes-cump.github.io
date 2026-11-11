/**
 * Contrôles de la liste d'acceptation, page par page : aucun contact de CUMP, mentions
 * obligatoires, lisible à 320 px, liens internes valides, animations coupées sur demande.
 * Les requêtes vers un autre site et les erreurs de console sont contrôlées par chaque test.
 */
import type { Page } from '@playwright/test';
import { expect, ouvrir, PAGES, test } from './outils.ts';

/** Tout le texte de la page, masqué compris, et celui des panneaux préparés au build. */
const toutLeTexte = (page: Page) =>
  page.evaluate(() => {
    const corps = document.body.cloneNode(true) as HTMLElement;
    for (const e of corps.querySelectorAll('script, style')) e.remove();
    return [
      corps.textContent ?? '',
      ...[...document.querySelectorAll('template')].map((t) => t.content.textContent ?? ''),
    ].join('\n');
  });

const TELEPHONE = /(?:\+33[\s.]?|\b0)[1-9](?:[\s.-]?\d{2}){4}\b/;
const COURRIEL = /[\w.+-]+@[\w-]+\.[a-z]{2,}/i;

for (const { id, chemin } of PAGES) {
  test.describe(`page ${id}`, () => {
    test('aucun numéro de téléphone ni adresse électronique', async ({ page }) => {
      await ouvrir(page, chemin);
      const texte = await toutLeTexte(page);
      expect(texte.match(TELEPHONE)?.[0] ?? null, 'numéro de téléphone').toBeNull();
      expect(texte.match(COURRIEL)?.[0] ?? null, 'adresse électronique').toBeNull();
      const liens = await page
        .locator('a[href^="tel:"], a[href^="mailto:"], a[href^="sms:"]')
        .count();
      expect(liens).toBe(0);
    });

    test('mention d’indépendance et avertissement', async ({ page }) => {
      await ouvrir(page, chemin);
      const pied = page.locator('footer.pied');
      await expect(pied).toContainText('Projet indépendant, non affilié à la SFMU');
      await expect(pied).toContainText(
        'Il ne remplace ni la régulation médicale du SAMU-Centre 15 ni la décision du référent CUMP.',
      );
      await expect(pied).toContainText(/Contenu|contenu/);
    });

    test('pas de défilement horizontal à 360 et 320 px', async ({ page }) => {
      for (const largeur of [360, 320]) {
        await page.setViewportSize({ width: largeur, height: 780 });
        await ouvrir(page, chemin);
        const deborde = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(deborde, `${largeur} px`).toBeLessThanOrEqual(0);
      }
    });
  });
}

test('tous les liens internes mènent à une page et à une ancre qui existent', async ({
  page,
  baseURL,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'ordinateur', 'une fois suffit');
  const origine = new URL(baseURL ?? '').origin;
  const cibles = new Map<string, Set<string>>();

  for (const { chemin } of PAGES) {
    await ouvrir(page, chemin);
    const hrefs = await page.evaluate(() =>
      [
        ...document.querySelectorAll('a[href]'),
        ...[...document.querySelectorAll('template')].flatMap((t) => [
          ...t.content.querySelectorAll('a[href]'),
        ]),
      ].map((a) => new URL(a.getAttribute('href') ?? '', document.baseURI).href),
    );
    for (const href of hrefs) {
      const url = new URL(href);
      if (url.origin !== origine) continue;
      const pageCible = url.origin + url.pathname;
      const ancres = cibles.get(pageCible) ?? new Set<string>();
      if (url.hash) ancres.add(decodeURIComponent(url.hash.slice(1)));
      cibles.set(pageCible, ancres);
    }
  }

  expect(cibles.size).toBeGreaterThan(PAGES.length - 1);
  for (const [pageCible, ancres] of cibles) {
    const reponse = await page.request.get(pageCible);
    expect(reponse.status(), pageCible).toBe(200);
    if (!ancres.size || !(reponse.headers()['content-type'] ?? '').includes('text/html')) continue;
    await ouvrir(page, pageCible);
    for (const ancre of ancres) {
      await expect(page.locator(`[id="${ancre}"]`), `${pageCible}#${ancre}`).toHaveCount(1);
    }
  }
});

test.describe('animations', () => {
  test.use({ reducedMotion: 'reduce' });

  test('le circuit s’allume d’un coup et le panneau s’ouvre sans glisser', async ({ page }) => {
    await ouvrir(page, 'circuit/');
    const radio = page.locator('input[name="chemin"]').last();
    const valeur = await radio.inputValue();
    await radio.check({ force: true });
    // Pas d'attente : tout doit être allumé dès le changement.
    const etat = await page.evaluate((v) => {
      const racine = document.querySelector<HTMLElement>('[data-circuit]');
      const ordres = JSON.parse(racine?.dataset.ordres ?? '{}') as Record<string, string[]>;
      return {
        attendues: ordres[v]?.length ?? 0,
        allumees: document.querySelectorAll('.circuit .allume[data-noeud]').length,
      };
    }, valeur);
    expect(etat.allumees).toBe(etat.attendues);

    await page.locator('.circuit [data-panneau]').first().click();
    const duree = await page
      .locator('#panneau-source')
      .evaluate((p) => getComputedStyle(p).transitionDuration);
    expect(duree.split(',').every((d) => Number.parseFloat(d) === 0)).toBe(true);
  });
});

test('le lien partagé affiche « Repères CUMP » comme titre', async ({ page }) => {
  await ouvrir(page, '');
  const meta = (propriete: string) =>
    page.locator(`meta[property="${propriete}"]`).getAttribute('content');
  expect(await meta('og:title')).toBe('Repères CUMP');
  expect(await meta('og:url')).toBe('https://reperes-cump.github.io/');
  expect(await meta('og:description')).toBe(
    'Déclenchement de la CUMP : ce que disent les textes officiels et la recommandation de la SFMU, avec leurs sources.',
  );
  await ouvrir(page, 'carte/');
  expect(await meta('og:title')).toBe('Carte des CUMP | Repères CUMP');
});
