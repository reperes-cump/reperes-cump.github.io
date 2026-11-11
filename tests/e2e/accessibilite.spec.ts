/**
 * Accessibilité (WCAG 2.2 AA, avec axe) : chaque page, en clair et en sombre, sur ordinateur
 * et sur téléphone, puis dans ses états ouverts (panneau, filtres, chemins, niveaux de carte).
 */
import { auditer, expect, ouvrir, PAGES, THEMES, test } from './outils.ts';

// Animations coupées : l'audit voit l'état final, pas une transition en cours.
test.use({ reducedMotion: 'reduce' });

for (const theme of THEMES) {
  test.describe(`thème ${theme === 'light' ? 'clair' : 'sombre'}`, () => {
    test.use({ colorScheme: theme });

    for (const { id, chemin } of PAGES) {
      test(`page ${id}`, async ({ page }) => {
        await ouvrir(page, chemin);
        await auditer(page, id);
      });
    }

    test('accueil : filtres, colonnes et panneau source', async ({ page }) => {
      await ouvrir(page, '');
      await page.getByText('Filtrer', { exact: true }).click();
      for (const radio of await page.locator('input[name="colonnes"]').all()) {
        await radio.check({ force: true });
        await auditer(page, `accueil, colonnes ${await radio.inputValue()}`);
      }
      await page.locator('.matrice [data-panneau]').first().click();
      await expect(page.locator('#panneau-source')).toBeVisible();
      await auditer(page, 'accueil, panneau ouvert');
    });

    test('circuit : chaque chemin et la version texte', async ({ page }) => {
      await ouvrir(page, 'circuit/');
      for (const radio of await page.locator('input[name="chemin"]').all()) {
        await radio.check({ force: true });
        await auditer(page, `circuit, chemin ${await radio.inputValue()}`);
      }
      await page.getByText('Version texte des chemins').click();
      await auditer(page, 'circuit, version texte');
      await page.locator('.circuit [data-panneau]').first().click();
      await expect(page.locator('#panneau-source')).toBeVisible();
      await auditer(page, 'circuit, panneau ouvert');
    });

    test('carte : niveaux et panneau d’un département', async ({ page }) => {
      await ouvrir(page, 'carte/');
      for (const radio of await page.locator('input[name="niveau"]:enabled').all()) {
        await radio.check({ force: true });
        await auditer(page, `carte, niveau ${await radio.inputValue()}`);
      }
      await page.locator('#tableau-departements [data-panneau]').first().click();
      await expect(page.locator('#panneau-source')).toBeVisible();
      await auditer(page, 'carte, panneau ouvert');
    });
  });
}
