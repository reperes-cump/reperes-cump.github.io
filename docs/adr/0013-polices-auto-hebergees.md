# 0013. Polices auto-hébergées

**Statut :** accepté, novembre 2026.

## Contexte

Le site ne doit faire aucune requête vers un domaine tiers, polices comprises. La lisibilité prime, de nuit et sur téléphone.

## Décision

**Atkinson Hyperlegible Next** (licence SIL OFL 1.1) est installée depuis npm (paquet Fontsource, version épinglée) et servie par l'API Fonts d'Astro depuis le site lui-même. Les extraits littéraux des sources utiliseront une police serif ; Source Serif 4 est prévue une fois sa licence vérifiée, la police serif du système en attendant.

## Alternatives écartées

- Google Fonts ou autre CDN : requête vers un domaine tiers.
- Fichiers de police copiés à la main : version non suivie.

## Conséquences

- La version de la police est suivie comme toute dépendance.
- Seuls les sous-ensembles utiles (latin, latin étendu) sont servis.
