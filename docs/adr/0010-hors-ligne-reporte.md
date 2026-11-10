# 0010. Consultation hors ligne reportée

**Statut :** accepté, novembre 2026.

## Contexte

Le site doit à terme être consultable sans réseau. Mais un cache ne doit jamais afficher une version du contenu corrigée entre-temps.

## Décision

Le hors ligne est **reporté à la V1.1**, une fois le contenu stable. Il passera par un service worker avec contrôle de version du contenu.

## Alternatives écartées

- Service worker dès la V1 : risque d'afficher un contenu périmé tant que le contenu évolue vite.

## Conséquences

- La V1 demande une connexion.
- Le choix du plugin (maintenu et compatible avec Astro) se fera à ce moment-là.
