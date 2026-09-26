// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
import worker from './worker';

afterEach(() => vi.unstubAllGlobals());

it('serves a compact public catalog, reuses its cache and preserves asset routing', async () => {
  const cache = { match: vi.fn(), put: vi.fn().mockResolvedValue(undefined) };
  vi.stubGlobal('caches', { open: vi.fn().mockResolvedValue(cache) });
  const upstream = {
    '1001': {
      id: 1001,
      name: 'Skin',
      description: 'Unused',
      chromas: [{ id: 1002, colors: ['#ffffff'], name: 'Chroma', rarities: ['Unused'] }],
    },
  };
  const fetch = vi.fn().mockResolvedValue(Response.json(upstream));
  vi.stubGlobal('fetch', fetch);
  const env = { ASSETS: { fetch: vi.fn().mockResolvedValue(new Response(null, { status: 404 })) } };
  const ctx = { waitUntil: vi.fn() };
  const request = new Request('https://skinfolio.chanuar.com/api/skins?ignored=1');
  const response = await worker.fetch(request, env, ctx);
  expect(response.status).toBe(200);
  expect(response.headers.get('Cache-Control')).toContain('max-age=3600');
  const data = await response.clone().json();
  expect(data['1001'].chromas[0].colors).toEqual(['#ffffff']);
  expect(data['1001']).not.toHaveProperty('description');
  expect(data['1001'].chromas[0]).not.toHaveProperty('rarities');
  expect(cache.put.mock.calls[0]?.[0].url).toBe('https://skinfolio.chanuar.com/api/skins');
  cache.match.mockResolvedValue(response);
  expect(await worker.fetch(request, env, ctx)).toBe(response);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(
    (await worker.fetch(new Request('https://skinfolio.chanuar.com/missing'), env, ctx)).status,
  ).toBe(404);
  expect((await worker.fetch(new Request(request, { method: 'POST' }), env, ctx)).status).toBe(405);

  cache.match.mockResolvedValue(undefined);
  cache.put.mockClear();
  for (const invalid of [
    {},
    { '1': { id: '1', name: 'Invalid' } },
    { '1': { id: 1, name: 'Skin', chromas: [{ id: 2, colors: [42] }] } },
  ]) {
    fetch.mockResolvedValue(Response.json(invalid));
    const failure = await worker.fetch(request, env, ctx);
    expect(failure.status).toBe(503);
    expect(failure.headers.get('Cache-Control')).toBe('no-store');
  }
  fetch.mockResolvedValue(new Response(null, { status: 502 }));
  expect((await worker.fetch(request, env, ctx)).status).toBe(503);
  expect(cache.put).not.toHaveBeenCalled();
});
