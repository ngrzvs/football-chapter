# Worker API

Le Worker et la SPA sont publiés ensemble via Workers Static Assets. Les routes `/api/*`
passent d'abord par Hono; le reste est servi depuis `dist` avec fallback SPA.

## Configuration Cloudflare

1. Créer la base D1 et remplacer l'identifiant nul dans `wrangler.jsonc` par son véritable ID.
2. Créer le bucket R2 `football-chapter-content` et publier un `manifest.json` versionné.
3. Ajouter les secrets avec `wrangler secret put HMAC_SECRET` et
   `wrangler secret put TURNSTILE_SECRET`.
4. Appliquer `wrangler d1 migrations apply football-chapter --remote`.
5. Construire la SPA puis lancer `wrangler deploy` depuis `apps/web`.

En production, l'API échoue volontairement si les secrets requis sont absents. Pour un test
local sans widget Turnstile, lancer Wrangler avec `--var ENVIRONMENT:development` et envoyer
le jeton explicite `dev-pass`. D1 reste obligatoire : aucun faux stockage global n'est utilisé.

Les défis expirent logiquement après 30 jours et un cron quotidien supprime ensuite défis,
runs associés, compteurs de débit expirés et analytics vieux de plus de 90 jours.
