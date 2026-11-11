# Contours des départements

- **Fichier** : `departements.topo.json`, produit par `npm run geo:preparer` (script `scripts/geo-preparer.ts`).
- **Origine** : jeu « Contours administratifs » de data.gouv.fr, ressource « Départements 2026 1000m (format GeoJSON) », dérivée d'ADMIN EXPRESS (IGN).
  - Page du jeu : https://www.data.gouv.fr/datasets/contours-administratifs
  - Fichier : https://contours-administratifs.s3.rbx.io.cloud.ovh.net/2026/geojson/departements-1000m.geojson
- **Millésime** : 2026 (ressource datée du 4 mai 2026).
- **Licence** : Open Database License (ODbL), indiquée sur la page du jeu. Ce fichier dérivé est diffusé sous la même licence. Toute réutilisation doit citer la source : « data.gouv.fr, d'après ADMIN EXPRESS (IGN), licence ODbL ».
- **Fichier consulté le** : 11 novembre 2026.
- **Empreinte SHA-256 du fichier d'origine** : `2a766d5c163988e7851447406eda266dd9edbc58754199b3dffc62832eba3b19`
- **Transformation** : seuls les 101 départements du Code officiel géographique 2026 sont gardés (les collectivités d'outre-mer sont écartées) ; conversion en TopoJSON, quantification 100 000. Aucune autre modification.
