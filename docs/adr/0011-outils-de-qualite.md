# 0011. Outils de qualité

**Statut :** accepté, novembre 2026.

## Contexte

Peu d'outils, actuels, qui couvrent les types, le style du code, les données, l'accessibilité et les liens.

## Décision

- **TypeScript strict**, vérifié par `astro check`.
- **Biome** pour le lint et le format.
- **Vitest** pour les tests des données.
- **Playwright et axe-core** pour les parcours et l'accessibilité (ajoutés avec les tests de parcours).
- **lychee** pour les liens des sources : à chaque pull request qui touche les sources et à la demande, sans bloquer, avec ouverture d'une issue si un lien est mort.

## Alternatives écartées

- ESLint et Prettier : deux outils au lieu d'un.

## Conséquences

- La CI lance types, lint, validation du contenu, tests et build à chaque pull request.
- TypeScript reste en version 6 tant que `astro check` ne prend pas en charge la version 7.
