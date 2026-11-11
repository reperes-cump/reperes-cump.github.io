// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import contenu from './src/integrations/contenu.ts';

const fichiers = '@fontsource-variable/atkinson-hyperlegible-next/files';
const latin =
  'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const latinEtendu =
  'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';

export default defineConfig({
  // Publié sur GitHub Pages, à la racine du site de l'organisation : https://reperes-cump.github.io/
  site: 'https://reperes-cump.github.io',
  base: '/',
  // Sortie 100 % statique.
  output: 'static',
  integrations: [contenu()],
  // Conserve les espaces entre éléments en ligne (typographie française).
  compressHTML: true,
  devToolbar: { enabled: false },
  // Polices servies depuis le site lui-même : aucune requête vers un domaine tiers.
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Atkinson Hyperlegible Next',
      cssVariable: '--police-texte',
      fallbacks: ['system-ui', 'sans-serif'],
      options: {
        variants: [
          {
            src: [`${fichiers}/atkinson-hyperlegible-next-latin-wght-normal.woff2`],
            weight: '200 800',
            style: 'normal',
            unicodeRange: [latin],
          },
          {
            src: [`${fichiers}/atkinson-hyperlegible-next-latin-ext-wght-normal.woff2`],
            weight: '200 800',
            style: 'normal',
            unicodeRange: [latinEtendu],
          },
          {
            src: [`${fichiers}/atkinson-hyperlegible-next-latin-wght-italic.woff2`],
            weight: '200 800',
            style: 'italic',
            unicodeRange: [latin],
          },
        ],
      },
    },
  ],
});
