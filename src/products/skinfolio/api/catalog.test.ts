import { afterEach, expect, it, vi } from 'vitest';
import { fetchCosmeticsCatalog } from './catalog';

afterEach(() => vi.unstubAllGlobals());

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
