import { expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ fetchCatalog: vi.fn(), fetchOwnership: vi.fn() }));

vi.mock('../api/catalog', () => ({ fetchCatalog: mocks.fetchCatalog, assetUrl: vi.fn() }));
vi.mock('../api/ownership', () => ({
  fetchOwnership: mocks.fetchOwnership,
}));

import { loader } from './SkinfolioRoute';

it('loads catalog and ownership together while keeping ownership failure recoverable', async () => {
  const catalog = { totals: { skins: 0 } };
  let releaseCatalog = () => {};
  let rejectOwnership = () => {};
  mocks.fetchCatalog.mockImplementation(
    () =>
      new Promise((resolve) => {
        releaseCatalog = () => resolve(catalog);
      }),
  );
  mocks.fetchOwnership.mockImplementation(
    () =>
      new Promise((_resolve, reject) => {
        rejectOwnership = () => reject(new Error('offline'));
      }),
  );

  const pending = loader();
  expect(mocks.fetchCatalog).toHaveBeenCalledOnce();
  expect(mocks.fetchOwnership).toHaveBeenCalledOnce();
  rejectOwnership();
  releaseCatalog();

  await expect(pending).resolves.toMatchObject({
    catalog,
    ownership: null,
    warning: expect.stringContaining('offline'),
  });
});
