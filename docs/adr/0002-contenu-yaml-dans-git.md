# 0002. Contenu en YAML, versionné dans Git

**Statut :** accepté, novembre 2026.

## Contexte

Un site fondé sur les sources a besoin d'une piste d'audit : qui a modifié quelle information, quand et pourquoi. Le contenu doit pouvoir évoluer sans toucher au code.

## Décision

Le contenu est une **donnée versionnée, indépendante du code** : des fichiers YAML dans `content/`, une source ou une information par fichier. Les modifications passent par des pull requests relues par le mainteneur.

## Alternatives écartées

- Supabase et autres bases hébergées : les projets gratuits Supabase sont mis en pause après 7 jours d'inactivité, l'inverse du besoin. Il faudrait aussi un compte à maintenir.
- Contenu écrit dans les pages : mélange du fond et de la forme, pas de validation possible.

## Conséquences

- L'historique Git sert de journal de chaque modification de source.
- Changer de générateur ne toucherait que la couche d'affichage : données, schémas et sources restent.
- Les fichiers sont lisibles et modifiables sans outil particulier.
