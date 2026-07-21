# Football Chapter

Une PWA bilingue de simulation de carrière football : décisions hebdomadaires, scènes de match jouables en 2.5D, progression de 16 à 24 ans et défis asynchrones rejoués côté serveur.

## Vertical slice V1

- Hub carrière responsive inspiré des concepts desktop et mobile approuvés.
- Création d'un joueur parmi 12 postes et trois difficultés.
- Boucle déterministe préparation → situation de match → décision → bilan.
- Cinq familles de gameplay : finisseur, créateur, soutien, défenseur et gardien.
- Sauvegarde locale immédiate dans IndexedDB, reprise et fonctionnement PWA hors ligne.
- Monde fictif de 144 clubs répartis dans six pays, 120 événements bilingues, 16 arcs et 40 situations.
- API Cloudflare Workers avec D1, R2, Turnstile, validation autoritaire des défis et signatures HMAC.

## Architecture

```text
apps/web                 React, Vite, PWA, Three.js et Worker Cloudflare
packages/protocol        Contrats publics et versions
packages/engine          Moteur pur, PRNG xoshiro128**, simulation et score
packages/content         Clubs, événements, arcs et situations FR/EN
```

Le moteur suit une frontière stricte : `advanceCareer(state, command) -> { state, events }`. Il n'utilise ni `Math.random`, ni l'heure système, ni le DOM. Les mêmes versions, graine et commandes produisent donc le même état dans le navigateur, Node et Cloudflare Workers.

## Démarrage

```bash
npm install
npm run dev
```

Puis ouvrir `http://127.0.0.1:5173`.

```bash
npm test
npm run typecheck
npm run build
npm run sim:100k
```

## Cloudflare

Copier `apps/web/.dev.vars.example` vers `.dev.vars`, créer D1 et R2, puis renseigner les identifiants dans `apps/web/wrangler.jsonc`. Appliquer les migrations avec Wrangler avant le premier déploiement.

```bash
npx wrangler d1 migrations apply football-chapter --local --config apps/web/wrangler.jsonc
npm run dev -w @football/web
```

Les secrets `HMAC_SECRET` et `TURNSTILE_SECRET` doivent être fournis par `wrangler secret put` en production.

## Données et vie privée

La carrière reste locale et ne nécessite pas de compte. Les mesures anonymes ne sont acceptées que si le lot envoyé contient un consentement explicite. Les classements de défis ne conservent que le pseudonyme filtré, le poste, le score et les empreintes du replay.

