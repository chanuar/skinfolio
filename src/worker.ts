import { CATALOG_BASE, compactSkins } from './products/skinfolio/api/skinData';

export default {
  async fetch(
    request: Request,
    env: { ASSETS: { fetch: typeof fetch } },
    ctx: { waitUntil(promise: Promise<unknown>): void },
  ): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== '/api/skins') return env.ASSETS.fetch(request);
    if (request.method !== 'GET')
      return new Response(null, { status: 405, headers: { Allow: 'GET' } });

    try {
      // Cache public catalog data for an hour; personal collection data never enters this cache.
      const cache = await caches.open('skinfolio-catalog-v1');
      const key = new Request(`${url.origin}/api/skins`);
      const cached = await cache.match(key);
      if (cached) return cached;
      const upstream = await fetch(`${CATALOG_BASE}/v1/skins.json`, {
        signal: AbortSignal.timeout(10000),
      });
      if (!upstream.ok) throw new Error('Catálogo no disponible');
      const response = Response.json(compactSkins(await upstream.json()), {
        headers: { 'Cache-Control': 'public, max-age=3600', 'X-Content-Type-Options': 'nosniff' },
      });
      ctx.waitUntil(cache.put(key, response.clone()).catch(() => undefined));
      return response;
    } catch {
      return Response.json(
        { error: 'Catálogo no disponible' },
        {
          status: 503,
          headers: { 'Cache-Control': 'no-store' },
        },
      );
    }
  },
};
