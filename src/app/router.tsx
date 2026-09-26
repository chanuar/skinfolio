import { createBrowserRouter, type RouteObject } from 'react-router';
import { NotFound } from './NotFound';
import { Loading } from './Loading';
import { RouteEnvironment } from './RouteEnvironment';

export const routes: RouteObject[] = [
  {
    Component: RouteEnvironment,
    HydrateFallback: Loading,
    children: [
      {
        index: true,
        handle: { page: 'skinfolio' },
        lazy: () => import('../products/skinfolio/routes/SkinfolioRoute'),
      },
      { path: '*', handle: { page: 'notFound' }, Component: NotFound },
    ],
  },
];

export const router = createBrowserRouter(routes);
