# DECISIONS.md

One-line decision log for non-obvious choices and architectural decisions.

2026-09-19: Initialized monorepo skeleton using npm workspaces, Vitest, React 18 + Vite + Tailwind, and TypeScript strict mode.
2026-09-19: Removed @types/babel__* to fix TS2688 type compilation errors with skipLibCheck.
2026-09-19: Added version field to root package.json and deleted package-lock.json to fix npm Invalid Version error.
2026-09-19: Installed tailwindcss, postcss, and autoprefixer locally in apps/web to fix Vite build.
2026-09-19: Renamed placeholder exports in packages/core to be unique to avoid TS2308 ambiguity.
2026-09-19: Fixed build by removing bin-links=false from .npmrc (tsc/vite need .bin stubs) and adding tailwindcss/postcss/autoprefixer to root devDependencies so they hoist correctly for apps/web.
2026-09-19: Replaced better-sqlite3 native extension with sql.js (WebAssembly SQLite) for cross-platform zero-compilation Node 24 support.
2026-09-19: Configured apps/web tsconfig.json with moduleResolution: bundler to support Vite JSON imports and React 18 TS compilation.
2026-09-19: Completed full 14-step offline pipeline, SQLite cache persistence, snapshot JSON exporter, and 8-invariant trust verification runner.
2026-09-19: Upgraded LandingPage and data layer to support Live Analysis mode, falling back gracefully to static bundled demo JSON snapshots if worker is disabled or rate-limited.
2026-09-19: Added express-rate-limit and dotenv to worker to enforce strict 5req/min API quotas and daily caps for live demo traffic.
