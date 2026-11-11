# 0009. Carte des CUMP en SVG généré au build

**Statut :** accepté, novembre 2026 (précisé à la construction de la carte).

## Contexte

La carte montre des désignations administratives. Elle ne doit faire aucune requête vers un domaine tiers et doit rester imprimable, lisible en noir et blanc et accessible.

## Décision

- La carte est un **SVG généré au build**. Aucune bibliothèque cartographique n'est envoyée au navigateur.
- **Contours** : jeu « Contours administratifs » de data.gouv.fr (version simplifiée à 1 000 m, d'après ADMIN EXPRESS de l'IGN). Les fichiers bruts restent hors du dépôt ; `npm run geo:preparer` en tire une version TopoJSON des 101 départements, versionnée dans `content/geo/` avec son fichier `SOURCE.md`.
- **Départements et régions** : Code officiel géographique de l'INSEE, produit par le même script dans `content/territoires/departements.yaml`.
- **Zones de défense et de sécurité** : composition relevée dans le code de la défense (`content/territoires/zones.yaml`), avec les noms des départements tels qu'écrits dans le texte.
- **Calcul** : d3-geo pour les projections (conique conforme pour la métropole, Mercator pour chaque encart d'outre-mer) ; topojson-client pour tracer les frontières des régions et des zones et placer leurs noms à partir des départements. Ces outils servent uniquement au build.
- **Alternative** : un tableau des départements, filtrable, avec les mêmes informations et les mêmes sources. Sans JavaScript, chaque département de la carte mène à sa ligne du tableau.

## Alternatives écartées

- Leaflet, MapLibre avec tuiles : requêtes vers des serveurs tiers, poids, inutile pour une carte administrative.
- ADMIN EXPRESS directement : sous licence ouverte, mais un téléchargement de plusieurs centaines de Mo à simplifier soi-même.
- Contours des régions et des zones téléchargés à part : risque d'incohérence avec ceux des départements.

## Conséquences

- Les contours dérivés sont sous **licence ODbL**, comme le jeu d'origine : attribution affichée sous la carte, exception notée dans `LICENSE-CONTENT`.
- Changer de millésime : télécharger les nouveaux fichiers dans `sources-local/`, relancer `npm run geo:preparer`, mettre à jour `SOURCE.md` et les fiches des sources.
