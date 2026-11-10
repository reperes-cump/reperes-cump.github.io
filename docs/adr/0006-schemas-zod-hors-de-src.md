# 0006. Schémas Zod hors de `src/`, validation autonome

**Statut :** accepté, novembre 2026.

## Contexte

La validation des données ne doit pas dépendre du framework d'affichage. Elle doit pouvoir tourner seule, en CI ou sur le poste d'un contributeur.

## Décision

Les schémas sont écrits avec **Zod 4** dans `schemas/`, hors de `src/`. Ils sont utilisés par Astro (collections de contenu) **et** par le script autonome `npm run validate`, qui lit les fichiers avec la même fonction. Les contrôles entre fichiers (sources existantes, grades, désignations, mode publication) sont dans `scripts/lib/regles.ts`. Le build lance la validation et échoue au moindre problème.

## Alternatives écartées

- Validation implicite dans les composants : dépendante du framework, incomplète, impossible à lancer seule.

## Conséquences

- Un contributeur peut valider le contenu sans connaître Astro.
- La même version de Zod sert au site et au script (épinglée, partagée avec Astro).
