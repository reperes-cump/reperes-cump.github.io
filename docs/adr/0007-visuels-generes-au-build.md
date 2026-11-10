# 0007. Visuels générés au build

**Statut :** accepté, novembre 2026.

## Contexte

La matrice, le circuit, la frise et la future fiche imprimable doivent rester cohérents avec les données, accessibles et imprimables.

## Décision

Les visuels sont du **SVG et du HTML générés au build** à partir des fichiers YAML.

## Alternatives écartées

- Images figées : à refaire à chaque modification.
- Mermaid exécuté dans le navigateur : lourd, peu stylable.

## Conséquences

- Modifier une donnée met à jour tous les visuels en même temps.
- Rendu accessible (texte réel, alternatives) et imprimable.
