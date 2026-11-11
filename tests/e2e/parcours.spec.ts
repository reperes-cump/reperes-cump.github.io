/**
 * Parcours d'un lecteur, au clavier quand c'est possible : la page doit dire la même chose
 * que les données du dépôt.
 */
import { expect, lireContenu, ouvrir, test } from './outils.ts';

test.use({ reducedMotion: 'reduce' });

test.describe('accueil', () => {
  test('une case de la matrice ouvre sa source au clavier, Échap la referme', async ({ page }) => {
    await ouvrir(page, '');
    const puce = page.locator('.matrice [data-panneau]').first();
    const modele = page.locator(`template#${await puce.getAttribute('data-panneau')}`);
    const titre = await modele.getAttribute('data-titre');

    await puce.focus();
    await page.keyboard.press('Enter');
    const panneau = page.locator('#panneau-source');
    await expect(panneau).toBeVisible();
    await expect(panneau.locator('#panneau-titre')).toHaveText(titre ?? 'Source');
    await expect(panneau.locator('#panneau-titre')).toBeFocused();
    await expect(panneau.locator('.document-titre')).not.toBeEmpty();
    await expect(panneau.getByText('Passage du texte')).toBeVisible();
    await expect(panneau.getByRole('link', { name: 'Voir la fiche de ce texte' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(panneau).toBeHidden();
    await expect(puce).toBeFocused();
  });

  test('en remontant au clavier, aucune case ne passe sous l’en-tête du tableau', async ({
    page,
  }) => {
    await ouvrir(page, '');
    await page.locator('.matrice [data-panneau]').last().focus();
    for (let i = 0; i < 60; i++) {
      await page.keyboard.press('Shift+Tab');
      const position = await page.evaluate(() => {
        const element = document.activeElement;
        const entete = document.querySelector('.matrice thead th');
        if (!element?.closest('.matrice tbody') || !entete) return null;
        return {
          bas: element.getBoundingClientRect().bottom,
          entete: entete.getBoundingClientRect().bottom,
        };
      });
      if (position) expect(position.bas).toBeGreaterThan(position.entete);
    }
  });

  test('chaque situation de la matrice vient des données', async ({ page }) => {
    const contenu = await lireContenu();
    const situations = [...contenu.affirmations.values()].filter((a) => a.categorie === 'matrice');
    await ouvrir(page, '');
    await expect(page.locator('.matrice tbody tr')).toHaveCount(situations.length);
  });

  test('les filtres masquent des lignes, « Tout afficher » les rend', async ({ page }) => {
    await ouvrir(page, '');
    const lignes = page.locator('.matrice tbody tr');
    const total = await lignes.count();
    await page.getByText('Filtrer', { exact: true }).click();
    for (const case_ of await page.locator('input[name="verdict"]').all()) {
      await case_.uncheck({ force: true });
    }
    await expect(page.locator('.matrice tbody tr:visible')).not.toHaveCount(total);
    await page.getByRole('button', { name: 'Tout afficher' }).click();
    await expect(page.locator('.matrice tbody tr:visible')).toHaveCount(total);
  });
});

test.describe('circuit', () => {
  test('chaque chemin allume ses étapes, dans la même liste que la version texte', async ({
    page,
  }) => {
    const contenu = await lireContenu();
    const chemins = contenu.visuels.get('circuit')?.chemins ?? [];
    expect(chemins.length).toBeGreaterThan(0);
    await ouvrir(page, 'circuit/');

    for (const c of chemins) {
      await page.locator(`input[name="chemin"][value="${c.id}"]`).check({ force: true });
      const attendus = [...c.etapes, ...c.issues, ...c.suites].sort();
      await expect
        .poll(() =>
          page
            .locator('.circuit .allume[data-noeud]')
            .evaluateAll((n) => n.map((e) => (e as HTMLElement).dataset.noeud ?? '').sort()),
        )
        .toEqual(attendus);
      const items = c.etapes.length + (c.issues.length ? 1 : 0) + (c.suites.length ? 1 : 0);
      await expect(page.locator(`#texte-${c.id} + ol > li`)).toHaveCount(items);
    }
  });

  test('le choix du chemin est annoncé aux lecteurs d’écran', async ({ page }) => {
    await ouvrir(page, 'circuit/');
    const radio = page.locator('input[name="chemin"]').last();
    await radio.focus();
    await page.keyboard.press('Space');
    await expect(page.locator('[data-annonce]')).toContainText('étapes affichées');
  });
});

test.describe('carte', () => {
  test('18 régionales, 27 renforcées et 10 zonales, sur la carte comme dans le tableau', async ({
    page,
  }) => {
    const contenu = await lireContenu();
    const attendu = (type: string) =>
      contenu.designations?.annexes
        .filter((a) => a.designation === type)
        .reduce((n, a) => n + a.entrees.length, 0);
    expect([attendu('regionale'), attendu('renforcee'), attendu('zonale')]).toEqual([18, 27, 10]);

    await ouvrir(page, 'carte/');
    const departements = contenu.referentiel?.departements.length ?? 0;
    await expect(page.locator('svg.carte a.dep')).toHaveCount(departements);
    await expect(page.locator('#tableau-departements tbody tr')).toHaveCount(departements);

    for (const type of ['regionale', 'renforcee', 'zonale']) {
      const tableau = await page
        .locator('#tableau-departements tbody tr')
        .evaluateAll(
          (lignes, t) =>
            lignes
              .flatMap((l) => (l as HTMLElement).dataset.types?.split(' ') ?? [])
              .filter((x) => x === t).length,
          type,
        );
      expect(tableau, `tableau : ${type}`).toBe(attendu(type));
      // Un département peut porter deux désignations du même type ; la carte le colore une fois.
      const departementsDuType = new Set(
        contenu.designations?.annexes
          .filter((a) => a.designation === type)
          .flatMap((a) => a.entrees.map((e) => e.departement)),
      ).size;
      await expect(page.locator(`svg.carte a.dep.${type}`), `carte : ${type}`).toHaveCount(
        departementsDuType,
      );
    }
  });

  test('les départements déduits de la commune sont signalés', async ({ page }) => {
    const contenu = await lireContenu();
    const deduits = (contenu.designations?.annexes ?? []).flatMap((a) =>
      a.entrees.filter((e) => e.departement_deduit),
    ).length;
    await ouvrir(page, 'carte/');
    await expect(page.locator('#tableau-departements .deduit')).toHaveCount(deduits);
  });

  test('un département de la carte ouvre son panneau', async ({ page }) => {
    await ouvrir(page, 'carte/');
    await page.locator('svg.carte a.dep[href="#dep-33"]').click();
    const panneau = page.locator('#panneau-source');
    await expect(panneau).toBeVisible();
    await expect(panneau.locator('#panneau-titre')).toHaveText('Département');
    await expect(panneau.locator('.contexte-titre')).toHaveText('Gironde (33)');
    await page.keyboard.press('Escape');
    await expect(panneau).toBeHidden();
  });

  test('le choix du niveau change les frontières affichées', async ({ page }) => {
    await ouvrir(page, 'carte/');
    const bloc = page.locator('[data-carte]');
    for (const niveau of await page.locator('input[name="niveau"]:enabled').all()) {
      await niveau.check({ force: true });
      await expect(bloc).toHaveAttribute('data-niveau', await niveau.inputValue());
    }
  });

  test('le lien d’évitement mène au tableau', async ({ page }) => {
    await ouvrir(page, 'carte/');
    await page.getByRole('link', { name: 'Aller au tableau des départements' }).click();
    await expect(page).toHaveURL(/#tableau-departements$/);
  });
});

test.describe('sources', () => {
  test('chaque texte a sa fiche, avec la liste des informations qui le citent', async ({
    page,
  }) => {
    const contenu = await lireContenu();
    await ouvrir(page, 'sources/');
    for (const id of contenu.sources.keys()) {
      await expect(page.locator(`article.fiche[id="${id}"]`), id).toHaveCount(1);
    }
  });

  test('« Voir la fiche de ce texte » mène à la bonne fiche', async ({ page }) => {
    await ouvrir(page, '');
    await page.locator('.matrice [data-panneau]').first().click();
    const lien = page.locator('#panneau-source').getByRole('link', {
      name: 'Voir la fiche de ce texte',
    });
    const ancre = new URL((await lien.getAttribute('href')) ?? '', page.url()).hash.slice(1);
    await lien.click();
    await expect(page).toHaveURL(/\/sources\/#/);
    await expect(page.locator(`article.fiche[id="${ancre}"]`)).toBeVisible();
  });
});

test.describe('navigation et recherche', () => {
  test('l’accueil a le menu des pages, comme les autres pages', async ({ page }) => {
    await ouvrir(page, '');
    const menu = page.getByRole('navigation', { name: 'Navigation principale' });
    for (const titre of ['Circuit', 'Carte', 'Sources', 'À propos']) {
      await expect(menu.getByRole('link', { name: new RegExp(titre) })).toBeVisible();
    }
  });

  test('la recherche filtre la matrice, sans tenir compte des accents', async ({ page }) => {
    await ouvrir(page, '');
    const lignes = page.locator('.matrice tbody tr:visible');
    const total = await page.locator('.matrice tbody tr').count();
    const champ = page.getByRole('searchbox', { name: 'Rechercher une situation' });
    await champ.fill('deces');
    await expect(lignes).toHaveCount(1);
    await expect(lignes.first()).toContainText('Décès accidentel');
    await champ.fill('introuvable');
    await expect(page.getByText('Aucune situation ne correspond.')).toBeVisible();
    await page.getByText('Filtrer', { exact: true }).click();
    await page.getByRole('button', { name: 'Tout afficher' }).click();
    await expect(champ).toHaveValue('');
    await expect(lignes).toHaveCount(total);
  });

  test('le cadre officiel est replié sous la matrice et s’ouvre par un lien', async ({ page }) => {
    await ouvrir(page, '');
    const cadre = page.locator('details#cadre-officiel');
    await expect(cadre).not.toHaveAttribute('open');
    await ouvrir(page, '#cadre-officiel');
    await expect(cadre).toHaveAttribute('open');
  });

  test('« Rechercher un département » ouvre la fiche, par numéro ou par nom', async ({ page }) => {
    await ouvrir(page, 'carte/');
    const champ = page.getByLabel('Rechercher un département');
    const panneau = page.locator('#panneau-source');
    await champ.fill('33');
    await champ.press('Enter');
    await expect(panneau.locator('.contexte-titre')).toHaveText('Gironde (33)');
    await page.keyboard.press('Escape');
    await expect(champ).toBeFocused();
    await champ.fill("cote d'or");
    await champ.press('Enter');
    await expect(panneau.locator('.contexte-titre')).toHaveText("Côte-d'Or (21)");
    await page.keyboard.press('Escape');
    await champ.fill('xyz');
    await champ.press('Enter');
    await expect(page.getByText('Aucun département ne correspond.')).toBeVisible();
    await expect(panneau).toBeHidden();
  });
});
