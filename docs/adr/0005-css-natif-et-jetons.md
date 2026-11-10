# 0005. CSS natif et jetons de design

**Statut :** accepté, novembre 2026.

## Contexte

Le style doit rester simple à maintenir pendant des années, sans migration imposée par un outil.

## Décision

**CSS natif**, avec des jetons de design en variables CSS (`src/styles/tokens.css`) : couleurs des modes clair et sombre, typographie, espacements.

## Alternatives écartées

- Tailwind : migrations majeures récentes.
- CSS-in-JS : dépendance à un framework.

## Conséquences

- Aucune migration de framework CSS à subir.
- Les contrastes des jetons sont calculés et documentés (niveau AA au minimum).
