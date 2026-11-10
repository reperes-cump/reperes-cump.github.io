# Contribuer

Merci de votre intérêt. Repères CUMP repose sur une règle simple : **tout ce qui est affiché doit pouvoir être retrouvé dans un texte en libre accès, à l'endroit indiqué.**

## Les règles

1. **Tout est sourcé.** Chaque information cite au moins une source, avec une localisation précise : article, section ou page. Une information sans source fait échouer le build.
2. **Uniquement des sources en libre accès.** Textes publiés (Légifrance, Bulletin officiel, Journal officiel), recommandations de sociétés savantes librement téléchargeables, pages d'institutions publiques. Aucun document interne : schéma type départemental, plan ORSAN, protocole d'établissement, support de formation.
3. **Aucune déduction.** On n'étend jamais une recommandation à une situation qu'elle ne cite pas. Si les textes ne traitent pas une situation, on écrit qu'ils ne la traitent pas.
4. **L'incertitude est une information.** « Pas de consensus » et « pas de conclusion » sont des résultats du vote des experts : on les affiche tels quels.
5. **Le vocabulaire de la source.** Chaque information reprend les termes de son texte (« psychiatre référent » dans les textes réglementaires, « référent CUMP » dans la recommandation SFMU). On n'harmonise pas.
6. **Le droit des sources.** Les textes officiels peuvent être cités. Une recommandation publiée dans une revue est reformulée ; un extrait littéral reste une courte citation, avec son auteur et sa source.
7. **Aucun numéro ni contact de CUMP.** Toute demande d'intervention s'adresse au SAMU-Centre 15.
8. **Aucun PDF dans le dépôt.** Les fichiers consultés restent sur votre poste (dossier `sources-local/`, exclu du dépôt).

## Signaler une erreur

Ouvrez une issue « Signaler une erreur de source » en indiquant le passage exact du texte (page, article ou section).

## Ajouter une source

1. Créez `content/sources/<id>.yaml`. L'identifiant est en minuscules, avec des tirets, et identique au nom du fichier.
2. Renseignez le titre exact, le type, l'autorité, l'URL en libre accès et les conditions de réutilisation.
3. Calculez l'empreinte du fichier consulté et notez la date de consultation :

   ```bash
   npm run source:hash -- sources-local/document.pdf
   ```
4. Demandez un instantané à la Wayback Machine et notez son adresse dans `url_archive`.
5. Laissez `statut: a_verifier` : le mainteneur le change après vérification.

## Ajouter ou modifier une information

Créez ou modifiez un fichier de `content/affirmations/`. Pour chaque source citée, indiquez la localisation (`article`, `annexe`, `section`, `page`) et, si possible, un lien direct (`lien_profond`, avec `#page=N` pour un PDF).

Ce qui manque encore se note dans `a_relever`, sans l'inventer. Les mots « grade », « note publique » et « définition » y sont reconnus par les contrôles. La page ou l'article manquants sont détectés automatiquement.

Les dates s'écrivent entre guillemets : `"2026-12-01"`.

## Vérification

Seul le mainteneur renseigne `verifie_le` et `verifie_par`, après avoir relu le passage dans le texte. Ne modifiez pas ces champs.

Avant la pull request :

```bash
npm run validate
npm test
```

Toute modification de `content/` est relue par le mainteneur avant fusion.
