# Skinfolio

Skinfolio is a personal League of Legends collection dashboard for exploring
the current cosmetic catalog and tracking collection progress. The interface is
currently available in Spanish.

## Features

- Browse skins and chromas grouped by champion.
- Search, filter, and sort the catalog by ownership, rarity, completion, or
  mastery.
- Track owned skins, chromas, collection value, and completion progress.
- Review active offers, other cosmetics, recent activity, and match history
  when those data sources are available.
- Inspect skin and chroma artwork in an accessible keyboard-friendly dialog.

## Data sources

The public catalog and artwork come from
[CommunityDragon](https://www.communitydragon.org/), so catalog data follows the
latest available League of Legends patch. Production serves a compact, validated
catalog through `/api/skins`, cached at the edge and in the browser for one hour.
Only public catalog fields are cached; personal collection data is read separately.
If this endpoint fails, the app falls back to CommunityDragon directly. Local Vite
development uses CommunityDragon directly as well.

Personal collection data is read from Supabase through its REST API. The
browser uses only a publishable key; Row Level Security must protect all exposed
tables. Skinfolio still provides catalog browsing when Supabase is not
configured.

## Tech stack

- React 19
- React Router 7
- TypeScript
- Vite
- Supabase REST API
- Vitest and Testing Library
- ESLint, Prettier, Husky, and lint-staged

## Getting started

### Requirements

- Node.js 20.19 or newer. Node 22 is the repository default.
- npm

### Setup

```bash
git clone https://github.com/chanuar/skinfolio.git
cd skinfolio
npm ci
```

Copy `.env.example` to `.env` and provide the browser-safe Supabase values if
you want to load personal collection data:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Never use a Supabase service-role key in this application.

Start the development server:

```bash
npm run dev
```

## Available scripts

| Command                | Description                               |
| ---------------------- | ----------------------------------------- |
| `npm run dev`          | Start the Vite development server.        |
| `npm run build`        | Type-check and create a production build. |
| `npm run preview`      | Preview the production build locally.     |
| `npm run lint`         | Run ESLint with zero warnings allowed.    |
| `npm run format`       | Format supported files with Prettier.     |
| `npm run format:check` | Check formatting without changing files.  |
| `npm run typecheck`    | Run strict TypeScript checks.             |
| `npm test`             | Run the Vitest suite once.                |
| `npm run test:watch`   | Run Vitest in watch mode.                 |

## Project structure

```text
src/
├── app/                  # Application startup, routing, metadata, and 404 UI
├── products/skinfolio/   # Skinfolio routes, components, models, APIs, and CSS
├── shared/config/        # Browser-safe Supabase environment configuration
└── test/                 # Shared test setup
public/                   # Static assets, robots.txt, and sitemap.xml
```

## Contributing

Before opening a pull request, run:

```bash
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
```

Git hooks run lint-staged checks before commits and the type-check and test
suite before pushes.

Skinfolio is a personal, unofficial project and is not affiliated with Riot
Games.
