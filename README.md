# Finance Tracker

A mobile-first personal expense tracker PWA built with Vite, React, TypeScript, Tailwind CSS, and shadcn/ui.

## Stack

- **Vite 8** — build tool
- **React 19 + TypeScript** — UI framework
- **Tailwind CSS v4** — styling (CSS-first config, no tailwind.config.js)
- **shadcn/ui** — component primitives (slate base, CSS variables)
- **React Router v7** — client-side routing
- **Dexie.js** — IndexedDB wrapper for local storage
- **Recharts** — charts (Phase 2)
- **Lucide React** — icons
- **vite-plugin-pwa** — PWA manifest + service worker

## Setup

```bash
npm install
npm run dev
```

The app runs at `http://localhost:5173`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build (TypeScript check + Vite bundle) |
| `npm run preview` | Preview production build locally |
| `npm run lint` | ESLint |

## Project structure

```
src/
  components/      # Shared UI components (Layout, Header, BottomNav)
  components/ui/   # shadcn/ui primitives (add via npx shadcn@latest add <component>)
  db/              # Dexie database schema (db.ts)
  lib/             # Utilities (cn helper)
  pages/           # Route-level page components
public/
  icons/           # PWA icons (192x192, 512x512)
```

## Adding shadcn/ui components

```bash
npx shadcn@latest add button
npx shadcn@latest add input
# etc.
```

Components are placed in `src/components/ui/`.

## Deploy to Vercel

1. Push to a GitHub repository.
2. Import the repo at [vercel.com/new](https://vercel.com/new).
3. Vercel auto-detects Vite — no configuration needed.
4. Set **Framework Preset** to `Vite` if not auto-detected.
5. Deploy. The PWA manifest and service worker are included in the production build.

> **Note:** For the PWA to be installable, the app must be served over HTTPS. Vercel deployments are HTTPS by default.

## PWA

The app is configured for install-on-mobile via `vite-plugin-pwa`:
- Auto-updates the service worker when a new version is deployed
- Manifest includes name, short name, theme color, and icons
- Works offline after first visit (Workbox precaching)

## Database schema

Defined in `src/db/db.ts` — IndexedDB via Dexie, database name `FinanceTrackerDB`:

| Field | Type | Description |
|-------|------|-------------|
| `id` | auto-increment | Primary key |
| `amount` | number | Expense amount |
| `category` | string | Category label |
| `note` | string | Optional note |
| `paymentMethod` | string | e.g. cash, card |
| `date` | string (ISO) | Date of expense |
| `isEssential` | boolean | Essential vs discretionary |
| `createdAt` | string (ISO) | Record creation time |
