# Método Ponto B

Strategic execution SaaS platform for RE/MAX SC franchises. Franchises set goals tied to strategic dimensions, track KPIs and initiatives, log daily/weekly/monthly check-ins, and get scored on execution consistency.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/db run seed` — seed database with franchises, users, dimensions, key processes, and strategic initiatives
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — express-session secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite, Wouter (routing), TanStack Query, shadcn/ui, Tailwind CSS, Recharts
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Auth: express-session with bcryptjs password hashing
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/db/src/schema/` — DB schema (users, franchises, dimensions, goals, checkins, support)
- `lib/db/src/seed.ts` — seed script with all 54 strategic initiatives
- `artifacts/api-server/src/routes/` — all API routes (auth, franchises, users, catalog, goals, checkins, support, dashboard, exports)
- `artifacts/api-server/src/middlewares/auth.ts` — requireAuth, requireRole, requireAdminOrStaff
- `artifacts/pontob/src/pages/` — all 20 screens
- `artifacts/pontob/src/lib/auth.tsx` — auth context and hooks
- `artifacts/pontob/src/components/` — sidebar, layout

## Architecture decisions

- Session-based auth (express-session) rather than JWT — simpler for SaaS with regional admin needs
- Orval codegen from OpenAPI spec — all frontend API calls use typed generated hooks; queryKey is required in options
- Score formula: 40% KRI + 30% initiative execution + 20% check-in consistency + 10% KPI update
- Max 3 KPIs per goal, max 3 active initiatives per goal — enforced in backend
- Seed lives in `lib/db` (not `scripts`) to use workspace dependencies cleanly

## Product

- 4 roles: master_admin, staff_regional, franqueado, responsavel_interno
- 2 active dimensions: Pessoas (6 key processes) and Real Estate (8 key processes)
- 54 strategic initiatives seeded from spec
- 20 screens: login, today, dashboard, goals (CRUD), initiatives, check-in (daily/weekly/monthly), history, alerts, help, catalog, ranking, regional dashboard, admin (franchises/users), settings

## Test Credentials (after seed)

- admin@remaxsc.com.br / admin123 (master_admin)
- regional@remaxsc.com.br / regional123 (staff_regional)
- franqueado@remaxsc.com.br / franqueado123 (franqueado)
- responsavel@remaxsc.com.br / responsavel123 (responsavel_interno)

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Orval-generated hooks require `queryKey` in the query options object — always pass it using the generated `getXQueryKey()` helper
- `bcryptjs` is installed in `lib/db` for seeding; `api-server` has its own bcryptjs for password verification
- Do not run `pnpm dev` at the workspace root
- `scripts` package cannot import `@workspace/db` directly via tsx — seed is in `lib/db/src/seed.ts` instead
- The `GetTodayOverviewParams` type only has `franchiseId`, not `date` — date filtering is handled server-side

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
