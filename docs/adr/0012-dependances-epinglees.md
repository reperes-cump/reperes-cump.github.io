# 0012. Dépendances épinglées, mises à jour mensuelles

**Statut :** accepté, novembre 2026.

## Contexte

Les mises à jour doivent être régulières mais sans surprise, et la chaîne d'approvisionnement protégée.

## Décision

- Versions exactes dans `package.json` et `package-lock.json`.
- Node 24 (LTS) indiqué dans `.nvmrc`.
- Dependabot une fois par mois, mises à jour groupées.
- Actions GitHub épinglées par SHA de commit.

## Alternatives écartées

- Mises à jour manuelles au fil de l'eau : oubliées ou faites dans l'urgence.

## Conséquences

- Une pull request de mise à jour par mois et par écosystème, passée par la CI.
- Une action GitHub compromise ne peut pas modifier le code exécuté sans nouveau commit dans ce dépôt.
