# Repères CUMP

**En connaissance de textes.** Déclencher la CUMP, textes à l'appui.

Repères CUMP rassemble ce que disent les textes officiels et les recommandations en libre accès sur le déclenchement de la cellule d'urgence médico-psychologique (CUMP). Il montre aussi, tout aussi clairement, ce que ces textes ne disent pas et ce sur quoi il n'y a pas de consensus. Chaque information renvoie à sa source exacte : article, section ou page.

C'est un outil d'information. Il ne remplace ni la régulation médicale du SAMU-Centre 15 ni la décision du référent CUMP.

Projet indépendant, non affilié à la SFMU, à l'AFORCUMP-SFP, au ministère chargé de la santé, à une ARS ni à un établissement de santé.

> **État actuel :** en construction. Le contenu est transcrit mais pas encore vérifié sur les textes ; le site n'est pas publié.

## Principes

- Toute information affichée cite sa source, avec sa localisation. Sans source, le build échoue.
- Uniquement des sources en libre accès. Aucun document interne.
- Aucune déduction : si les textes ne traitent pas une situation, le site le dit.
- Cinq états distincts : recommandé, déconseillé, pas de consensus, pas de conclusion, silence des textes. Jamais de verdict global.
- Pas d'IA, pas de base de données, pas de cookie, pas de mesure d'audience, aucune requête vers un autre domaine.

## Modifier le contenu

Tout le contenu est dans le dossier [`content/`](content/), en fichiers YAML. Il n'y a pas besoin de toucher au code.

| Dossier                 | Contenu                                                                                               |
| ----------------------- | ----------------------------------------------------------------------------------------------------- |
| `content/sources/`      | Une source par fichier : titre, statut, lien, empreinte du fichier consulté.                          |
| `content/affirmations/` | Une information sourcée par fichier : énoncé ou ligne de matrice, verdict, sources avec localisation. |
| `content/visuels/`      | L'ordre des éléments du circuit, de la frise, de la pyramide, de l'encadré et du glossaire.           |
| `content/territoires/`  | Les désignations de CUMP relevées dans l'arrêté.                                                      |
| `content/contenu.yaml`  | Version du contenu, date de dernière vérification, mainteneur.                                        |

Exemple de ligne de matrice (la page est fictive) :

```yaml
id: matrice-chaos
categorie: matrice
situation: "Événement potentiellement traumatique entraînant une situation de chaos"
verdicts:
  alerte: { valeur: recommande, grade: accord_fort }
  activation: { valeur: recommande, grade: accord_fort }
sources:
  - source_id: sfmu-2017
    porte_sur: alerte
    localisation: { page: 6 }
  - source_id: sfmu-2017
    porte_sur: activation
    localisation: { page: 6 }
critere_explorateur: chaos
```

Après une modification :

```bash
npm run validate
```

La commande dit ce qui ne va pas, fichier par fichier. `npm run a-relever` liste tout ce qui reste à relever ou à vérifier.

Les règles de contribution sont dans [CONTRIBUTING.md](CONTRIBUTING.md).

## Développement

Il faut Node 24 (voir [`.nvmrc`](.nvmrc)).

```bash
npm ci
npm run dev
```

| Commande                           | Rôle                                                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `npm run dev`                      | Site en local, rechargé à chaque modification.                                                         |
| `npm run build`                    | Valide le contenu, construit le site dans `dist/` et publie les données ouvertes dans `dist/donnees/`. |
| `npm run check`                    | Vérifie les types.                                                                                     |
| `npm run lint`                     | Lint et format (Biome). `npm run format` corrige.                                                      |
| `npm run validate`                 | Valide le contenu.                                                                                     |
| `npm run a-relever`                | Liste ce qui reste à relever ou à vérifier.                                                            |
| `npm test`                         | Tests des données (Vitest).                                                                            |
| `npm run source:hash -- <fichier>` | Empreinte SHA-256 d'un PDF de source.                                                                  |

**Mode publication.** Avec `PUBLISH=1`, le build exige que tout soit vérifié : chaque information doit avoir une date de vérification et une localisation précise, et aucune source citée ne doit rester « à vérifier ». Le déploiement se fait dans ce mode.

Les PDF des sources ne sont jamais versionnés. Pour la vérification, ils restent dans `sources-local/`, exclu du dépôt.

Les choix techniques sont expliqués dans [`docs/adr/`](docs/adr/).

## Données ouvertes

Chaque build publie les données sous `/donnees/` : `affirmations.json`, `sources.json` et leurs équivalents CSV, avec leur licence.

## Licences

- Code : [MIT](LICENSE).
- Contenu rédigé et jeu de données : [CC BY 4.0](LICENSE-CONTENT).
- Les extraits de sources restent soumis aux droits de leurs auteurs.
