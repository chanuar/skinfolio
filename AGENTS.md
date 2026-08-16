# Repository Guidelines

Skinfolio is a standalone Vite application using React 19, React Router 7, and
strict TypeScript. The public route is `/`; unknown direct requests must return
`404.html` and remain `noindex`.

- Keep product code in `src/products/skinfolio/`; standalone startup, metadata,
  routing, and 404 code belong in `src/app/`.
- Keep raw Supabase REST data inside the product API. UI and model code receive
  camelCase domain types.
- Preserve semantic controls, keyboard behavior, focus restoration, the skip
  link, and `<main id="main-content" tabIndex={-1}>` on every route surface.
- Keep `index.html` and `RouteEnvironment.tsx` metadata synchronized with
  `https://skinfolio.chanuar.com/`.
- Never commit `.env`, build output, dependencies, tokens, or service-role keys.

Use Prettier, ESLint with zero warnings, strict TypeScript, Vitest, lint-staged,
and Husky. Before handoff run `npm run lint`, `npm run format:check`,
`npm run typecheck`, `npm test`, and `npm run build`.
