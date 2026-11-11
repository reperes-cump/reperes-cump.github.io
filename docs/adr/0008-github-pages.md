# 0008. Hébergement sur GitHub Pages

**Statut :** accepté, novembre 2026.

## Contexte

Le site est statique et le dépôt public. L'hébergement ne doit demander ni compte tiers ni abonnement.

## Décision

**GitHub Pages**, déployé par GitHub Actions à chaque fusion sur `main`, à l'adresse `reperes-cump.github.io`. Le dépôt appartient à l'organisation GitHub `reperes-cump` et s'appelle `reperes-cump.github.io` : le site est ainsi servi à la racine, sous un nom de projet plutôt que sous le nom d'une personne. Le build de déploiement se fait en mode publication : il échoue tant qu'un élément n'est pas vérifié.

## Alternatives écartées

- Netlify, Cloudflare Pages : possibles à tout moment sans changer le code, puisque la sortie est statique.

## Conséquences

- Gratuit pour un dépôt public ; limites (site de 1 Go, environ 100 Go de bande passante par mois) très au-dessus du besoin.
- Pas de nom de domaine propre en V1 : rien à renouveler.
- Aucun processus essentiel ne repose sur une tâche planifiée : GitHub désactive les workflows planifiés d'un dépôt public après 60 jours sans activité.
