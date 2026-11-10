# 0004. Pas de framework d'interface

**Statut :** accepté, novembre 2026.

## Contexte

L'interactivité nécessaire est limitée : ouvrir un panneau source, filtrer, basculer un affichage. Chaque dépendance est une mise à jour forcée de plus.

## Décision

**Pas de framework d'interface.** HTML natif (`<dialog>`, `<details>`, attribut `popover`), CSS moderne (`:has()`, requêtes de conteneur, couches de cascade) et petits modules TypeScript.

## Alternatives écartées

- Preact, React, Svelte : utiles ailleurs, inutiles ici.

## Conséquences

- La plateforme web ne casse pas ses API : le code reste valable dans la durée.
- Le site fonctionne en grande partie sans JavaScript.
