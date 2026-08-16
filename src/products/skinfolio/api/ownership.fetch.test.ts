import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../shared/config/supabase', () => ({
  supabaseEnvironment: {
    configured: true,
    url: 'https://example.supabase.co',
    publishableKey: 'publishable',
  },
}));

import { fetchOwnership } from './ownership';

const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

afterEach(() => vi.unstubAllGlobals());

describe('Skinfolio Supabase reads', () => {
  it('starts independent reads together and accepts a missing optional table', async () => {
    const releases: Array<() => void> = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (input: RequestInfo | URL) =>
          new Promise<Response>((resolve) => {
            const missing = String(input).includes('/skin_prices?');
            releases.push(() =>
              resolve(missing ? response({ code: 'PGRST205' }, 404) : response([])),
            );
          }),
      ),
    );

    const pending = fetchOwnership();
    expect(fetch).toHaveBeenCalledTimes(10);
    releases.forEach((release) => release());

    await expect(pending).resolves.toMatchObject({
      ownership: expect.any(Object),
      warning: null,
    });
  });

  it('keeps base ownership but reports a genuine optional read failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) =>
        Promise.resolve(
          String(input).includes('/skin_prices?') ? response({ code: 'XX000' }, 500) : response([]),
        ),
      ),
    );

    await expect(fetchOwnership()).resolves.toMatchObject({
      ownership: expect.any(Object),
      warning: expect.stringContaining('HTTP 500'),
    });
  });
});
