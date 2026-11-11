/**
 * Outils communs aux tests dans le navigateur.
 * Chaque test vérifie en plus, sans rien écrire : aucune requête vers un autre site et aucune
 * erreur JavaScript dans la console.
 */
import AxeBuilder from '@axe-core/playwright';
import { test as base, expect, type Page } from '@playwright/test';
import { chargerContenu } from '../../scripts/lib/contenu.ts';

/** Les pages publiées, chemin relatif à la base du site. */
export const PAGES = [
  { id: 'accueil', chemin: '' },
  { id: 'circuit', chemin: 'circuit/' },
  { id: 'carte', chemin: 'carte/' },
  { id: 'sources', chemin: 'sources/' },
  { id: 'a-propos', chemin: 'a-propos/' },
] as const;

export const THEMES = ['light', 'dark'] as const;

/** Normes vérifiées par axe : WCAG 2.0, 2.1 et 2.2, niveaux A et AA. */
const NORMES = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'];

export const test = base.extend<{ controles: undefined }>({
  controles: [
    async ({ page, baseURL }, use) => {
      const origine = new URL(baseURL ?? '').origin;
      const ailleurs: string[] = [];
      const erreurs: string[] = [];
      page.on('request', (requete) => {
        const url = new URL(requete.url());
        if (url.protocol.startsWith('http') && url.origin !== origine) ailleurs.push(requete.url());
      });
      page.on('pageerror', (erreur) => erreurs.push(erreur.message));
      page.on('console', (message) => {
        if (message.type() === 'error') erreurs.push(message.text());
      });
      await use(undefined);
      expect(ailleurs, 'requêtes vers un autre site').toEqual([]);
      expect(erreurs, 'erreurs dans la console').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** Audit axe de la page dans son état actuel ; échoue sur la moindre erreur. */
export async function auditer(page: Page, contexte: string) {
  const resultat = await new AxeBuilder({ page }).withTags(NORMES).analyze();
  const erreurs = resultat.violations.map((v) => ({
    regle: v.id,
    impact: v.impact,
    aide: v.help,
    elements: v.nodes.slice(0, 5).map((n) => n.target.join(' ')),
  }));
  expect(erreurs, `accessibilité : ${contexte}`).toEqual([]);
}

/** Ouvre une page et attend que ses scripts aient tourné. */
export async function ouvrir(page: Page, chemin: string) {
  await page.goto(chemin);
  await page.waitForLoadState('load');
}

let contenu: Awaited<ReturnType<typeof chargerContenu>>['contenu'] | null = null;

/** Le contenu du dépôt, pour comparer la page aux données. */
export async function lireContenu() {
  contenu ??= (await chargerContenu(process.cwd())).contenu;
  return contenu;
}
