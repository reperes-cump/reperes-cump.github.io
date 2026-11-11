import { defineConfig } from '@playwright/test';

/**
 * Tests dans un vrai navigateur, sur le site construit (`dist/`), servi par `astro preview`.
 * Lancer `npm run test:e2e` (construit puis teste), ou `npx playwright test` après un build.
 * Navigateur : le Chrome installé sur la machine (présent aussi sur les machines de GitHub),
 * pour n'avoir aucun navigateur à télécharger.
 */
const PORT = 4322;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}/`,
    channel: 'chrome',
    locale: 'fr-FR',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'ordinateur', use: { viewport: { width: 1280, height: 800 } } },
    { name: 'telephone', use: { viewport: { width: 360, height: 780 }, hasTouch: true } },
  ],
  webServer: {
    // --ignore-lock : serveur au premier plan, même quand Astro croit être lancé par un agent.
    command: `npm run preview -- --host 127.0.0.1 --port ${PORT} --ignore-lock`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    env: { ASTRO_TELEMETRY_DISABLED: '1' },
  },
});
