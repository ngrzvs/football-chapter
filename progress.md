Original prompt: Implémenter la V1 d'une PWA bilingue de simulation de carrière football, inspirée de NSS, Destiny Eleven et Copero, avec moteur déterministe, hub, match 3D, contenu, sauvegarde locale et défis Cloudflare.

## En cours

- Monorepo TypeScript, contrats publics, moteur, contenu, PWA et Worker implémentés.
- Références visuelles approuvées comparées au hub desktop, au match 2.5D et au hub mobile.
- Tests Vitest : 18/18. Build Vite : réussi. Worker : 7/7, bundle et migration validés.
- Playwright : onboarding, hub, match avant action, action jusqu’à la décision et mobile vérifiés sans erreur console.
- Dépôt public GitHub créé et branche complète publiée dans la draft PR #1.

## Contraintes à préserver

- `Math.random`, l'heure système et le DOM sont interdits dans le moteur.
- Même graine + mêmes commandes + même version doivent produire le même état.
- Clubs, joueurs, emblèmes et compétitions sont fictifs.
- Le défi impose Standard et est rejoué de façon autoritaire côté Worker.
- FR/EN doivent rester strictement à parité.

## TODO

- Remplacer l’identifiant D1 nul et fournir les secrets avant déploiement Cloudflare.
- Exécuter le laboratoire complet 100 000 carrières sur CI/runner long (le script est disponible).

## Client PWA — design system et architecture

- Références verrouillées : hub desktop 1568×1004, match 1584×1024 et hub mobile 853×1869.
- Palette : fond `#070b0b`, surfaces `#0d1212`/`#121818`, texte ivoire `#eeeae0`, vert `#69a856`, action `#ffc51b`, bordures `#313939`.
- Typographies locales : Oswald pour les titres/chrome, Inter pour les textes et nombres secondaires.
- Conteneurs : bandes et rails rectangulaires, séparateurs 1 px, rayon très contenu (0–10 px), CTA jaune principal.
- Asset éditorial généré sans texte ni marque pour éviter d’embarquer la maquette dans l’UI.
