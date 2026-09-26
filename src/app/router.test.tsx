import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createMemoryRouter, matchRoutes, RouterProvider } from 'react-router';
import { RouteEnvironment } from './RouteEnvironment';
import { routes } from './router';

afterEach(() => {
  cleanup();
  document.head.querySelectorAll('link[rel="preload"][as="font"]').forEach((node) => node.remove());
});

describe('Skinfolio router', () => {
  it('shows an accessible initial surface while data is pending', () => {
    const router = createMemoryRouter([
      {
        path: '/',
        HydrateFallback: routes[0]?.HydrateFallback,
        loader: () => new Promise(() => {}),
        element: <p>Loaded</p>,
      },
    ]);
    render(<RouterProvider router={router} />);
    expect(screen.getByRole('heading', { name: 'Skinfolio' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
    expect(screen.getByRole('status')).toHaveTextContent('Cargando catálogo y colección');
    router.dispose();
  });
  it('owns the hostname root and catches unknown routes', () => {
    expect(matchRoutes(routes, '/')?.at(-1)?.route.index).toBe(true);
    expect(matchRoutes(routes, '/missing')?.at(-1)?.route.path).toBe('*');
  });

  it('publishes production metadata at the root', async () => {
    const router = createMemoryRouter(
      [
        {
          Component: RouteEnvironment,
          children: [
            {
              index: true,
              handle: { page: 'skinfolio' },
              element: <main id="main-content">Colección</main>,
            },
          ],
        },
      ],
      { initialEntries: ['/'] },
    );

    render(<RouterProvider router={router} />);

    await waitFor(() => expect(document.title).toBe('Skinfolio — Colección de skins'));
    expect(document.body).toHaveClass('skinfolio-page');
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://skinfolio.chanuar.com/',
    );
    expect(document.querySelectorAll('link[rel="preload"][as="font"]')).toHaveLength(2);
  });

  it('keeps unknown routes out of search results', async () => {
    const router = createMemoryRouter(
      [
        {
          Component: RouteEnvironment,
          children: [
            {
              path: '*',
              handle: { page: 'notFound' },
              element: <main id="main-content">No encontrada</main>,
            },
          ],
        },
      ],
      { initialEntries: ['/missing'] },
    );

    render(<RouterProvider router={router} />);

    await waitFor(() => expect(document.title).toBe('Página no encontrada — Skinfolio'));
    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );
    expect(document.querySelector('link[rel="canonical"]')).not.toBeInTheDocument();
  });
});
