# 0001. Site statique

**Statut :** accepté, novembre 2026.

## Contexte

Le site doit fonctionner pendant des années sans entretien, être hébergeable partout et exposer le moins de surface d'attaque possible. Il ne collecte aucune donnée et n'a pas besoin de comptes.

## Décision

Le site est **entièrement statique** : un ensemble de fichiers HTML, CSS et JavaScript générés au build. Pas de serveur d'application, pas de base de données.

## Alternatives écartées

- Application avec serveur ou base hébergée : à maintenir en vie, à mettre à jour, à sécuriser, pour aucun besoin réel.

## Conséquences

- Rien n'expire : le site publié continue de fonctionner même si personne n'y touche.
- Toute interactivité se fait dans le navigateur, sans appel à un serveur.
- Changer d'hébergeur ne demande aucune modification du code.
