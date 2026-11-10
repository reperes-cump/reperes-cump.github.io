# 0009. Carte des CUMP en SVG généré au build

**Statut :** accepté, novembre 2026.

## Contexte

La carte montre des désignations administratives. Elle ne doit faire aucune requête vers un domaine tiers et doit rester imprimable et accessible.

## Décision

La carte est un **SVG généré au build** à partir de contours administratifs en licence ouverte, projetés avec d3-geo. Les cinq DROM sont placés en encarts. Un tableau des départements sert d'alternative.

## Alternatives écartées

- Leaflet, MapLibre avec tuiles : requêtes vers des serveurs tiers, poids, inutile pour une carte administrative.

## Conséquences

- Aucune bibliothèque cartographique ni tuile au chargement de la page.
- Les contours, leur origine et leur licence sont versionnés avec le contenu.
