# 0011. Outils de qualité

**Statut :** accepté, novembre 2026.

## Contexte

Peu d'outils, actuels, qui couvrent les types, le style du code, les données, l'accessibilité et les liens.

## Décision

- **TypeScript strict**, vérifié par `astro check`.
- **Biome** pour le lint et le format.
- **Vitest** pour les tests des données.
- **Playwright et axe-core** pour les parcours et l'accessibilité, sur le site construit : chaque page en clair et en sombre, sur ordinateur et à 360 px, avec les règles WCAG 2.2 A et AA. Chaque test vérifie aussi qu'aucune requête ne part vers un autre site et que la console reste sans erreur.
- Les tests utilisent le **Google Chrome installé** sur le poste et sur les machines de GitHub (`channel: 'chrome'`) : aucun navigateur à télécharger.
- **lychee** pour les liens des sources : à chaque pull request qui touche les sources et à la demande, sans bloquer, avec ouverture d'une issue si un lien est mort.

## Alternatives écartées

- ESLint et Prettier : deux outils au lieu d'un.
- Navigateurs fournis par Playwright : un téléchargement d'environ 150 Mo à chaque mise à jour de Playwright, sans gain pour un site testé dans un seul moteur.

## Conséquences

- La CI lance types, lint, validation du contenu, tests, build et tests dans le navigateur à chaque pull request. Le déploiement relance les mêmes contrôles, puisqu'un push direct sur `main` ne passe pas par la CI.
- La version de Chrome suit celle du poste ou de la machine de GitHub : un écart de rendu entre deux versions reste possible, mais les tests portent sur la structure et l'accessibilité, pas sur des captures d'écran.
- Astro lance son serveur d'aperçu en arrière-plan quand il croit être piloté par un agent ; la configuration de Playwright passe `--ignore-lock` pour le garder au premier plan.
- TypeScript reste en version 6 tant que `astro check` ne prend pas en charge la version 7.
