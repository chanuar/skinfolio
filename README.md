# Skinfolio

Colección personal de skins de League of Legends.

## Desarrollo

```powershell
Copy-Item .env.example .env
npm ci
npm run dev
```

Antes de entregar cambios, ejecuta `npm run lint`, `npm run format:check`,
`npm run typecheck`, `npm test` y `npm run build`.

## Despliegue

Cloudflare Workers sirve `dist` según `wrangler.jsonc`. Configura solo
`VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`.
