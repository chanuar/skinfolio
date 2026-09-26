import { afterEach, expect, it, vi } from 'vitest';
import { fetchCatalog, fetchCosmeticsCatalog } from './catalog';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it('preserves collection data with the compact endpoint and upstream fallback', async () => {
  vi.stubEnv('PROD', true);
  const skins = {
    '1001': {
      id: 1001,
      name: 'Test skin',
      chromas: [{ id: 1002, name: 'Blue', colors: ['#0000ff'] }],
    },
  };
  let compactAvailable = true;
  const fetch = vi.fn(async (url: string) => {
    if (url.endsWith('champion-summary.json')) return Response.json([{ id: 1, name: 'Annie' }]);
    if (url === '/api/skins' && !compactAvailable) return new Response(null, { status: 503 });
    return Response.json(skins);
  });
  vi.stubGlobal('fetch', fetch);
  const catalog = await fetchCatalog();
  expect(catalog.totals.skins).toBe(1);
  expect(catalog.chromaById.get(1002)?.chroma.name).toBe('Blue');
  expect(fetch.mock.calls.some(([url]) => url.endsWith('/v1/skins.json'))).toBe(false);
  compactAvailable = false;
  expect(await fetchCatalog()).toEqual(catalog);
  expect(fetch.mock.calls.some(([url]) => url.endsWith('/v1/skins.json'))).toBe(true);
});

it('retries a failed cosmetics download and caches a successful one', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('', { status: 503 }));
  vi.stubGlobal('fetch', fetch);

  await expect(fetchCosmeticsCatalog()).rejects.toThrow('No se pudo descargar');

  fetch.mockImplementation(() => Promise.resolve(new Response('[]')));
  const catalog = await fetchCosmeticsCatalog();
  expect(catalog.wards.size).toBe(0);
  expect(await fetchCosmeticsCatalog()).toBe(catalog);
  expect(fetch).toHaveBeenCalledTimes(6);
});
