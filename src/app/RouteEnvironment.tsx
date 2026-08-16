import { useEffect, useRef } from 'react';
import { Outlet, useLocation, useMatches } from 'react-router';

const META = {
  skinfolio: {
    title: 'Skinfolio — Colección de skins',
    description: 'Mi colección de skins de League of Legends: skins, chromas, ofertas y progreso.',
    image:
      'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/characters/ahri/skins/skin27/images/ahri_splash_centered_27.jpg',
  },
  notFound: {
    title: 'Página no encontrada — Skinfolio',
    description: 'La página que buscas no existe.',
    image: '/favicon.svg',
  },
} as const;

const SITE_URL = 'https://skinfolio.chanuar.com';

type Page = keyof typeof META;

export function RouteEnvironment() {
  const matches = useMatches();
  const location = useLocation();
  const page = [...matches]
    .reverse()
    .find((match) => (match.handle as { page?: Page } | undefined)?.page);
  const name = (page?.handle as { page: Page } | undefined)?.page ?? 'notFound';
  const meta = META[name];
  const pageUrl = new URL(name === 'skinfolio' ? '/' : location.pathname, SITE_URL).href;
  const image = new URL(meta.image, window.location.origin).href;
  const previousPath = useRef(location.pathname);

  useEffect(() => {
    document.documentElement.lang = 'es';
    document.body.className = 'skinfolio-page';
  }, []);

  useEffect(() => {
    const routeChanged = previousPath.current !== location.pathname;
    previousPath.current = location.pathname;
    if (routeChanged) document.getElementById('main-content')?.focus();
  }, [location.pathname]);

  return (
    <>
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      <meta name="theme-color" content="#010a13" />
      <meta property="og:title" content={meta.title} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:type" content="website" />
      <meta property="og:locale" content="es_ES" />
      <meta property="og:site_name" content="Skinfolio" />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content={name === 'skinfolio' ? '1280' : '64'} />
      <meta property="og:image:height" content={name === 'skinfolio' ? '720' : '64'} />
      <meta
        name="twitter:card"
        content={name === 'skinfolio' ? 'summary_large_image' : 'summary'}
      />
      <meta name="twitter:title" content={meta.title} />
      <meta name="twitter:description" content={meta.description} />
      <meta name="twitter:image" content={image} />
      {name === 'skinfolio' ? (
        <>
          <link rel="canonical" href={pageUrl} />
          <link
            rel="preload"
            as="font"
            type="font/woff2"
            crossOrigin="anonymous"
            href="/fonts/beaufort-bold.woff2"
          />
          <link
            rel="preload"
            as="font"
            type="font/woff2"
            crossOrigin="anonymous"
            href="/fonts/spiegel-regular.woff2"
          />
        </>
      ) : (
        <meta name="robots" content="noindex, nofollow" />
      )}
      <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      <Outlet />
    </>
  );
}
