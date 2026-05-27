# Threat Model

## Project Overview

Método Ponto B is a public-facing SaaS platform for RE/MAX SC franchises. It uses a React frontend and an Express 5 API backed by PostgreSQL/Drizzle. The production security model is session-based (`express-session` + PostgreSQL session store) with multiple business roles and heavy tenant scoping by franchise. The application also includes AI-backed endpoints that synthesize franchise, recruiting, and check-in data into prompts for OpenAI.

## Assets

- **User accounts and sessions** — authenticated sessions confer access to franchise performance data, recruiting workflows, and admin functions. Session compromise enables impersonation.
- **Franchise business data** — goals, KPIs, initiatives, planner data, check-ins, alerts, and dashboards reveal operational performance and sensitive business context for individual franchises.
- **Recruiting data** — job descriptions, candidate profiles, recruiter notes, interview notes, and recommendations contain confidential personnel and hiring information.
- **Administrative controls** — user creation, role assignment, franchise management, audit undo actions, and invite approval flows can materially change tenant access and system integrity.
- **Application secrets and reset tokens** — session secret, database credentials, password reset tokens, invite/approval tokens, and outbound email/push infrastructure must remain confidential.

## Trust Boundaries

- **Browser/mobile client -> API** — every request crossing into `/api` is untrusted and must be authenticated, authorized, and tenant-scoped server-side.
- **Authenticated user -> privileged/admin functionality** — `staff_regional`, `master_admin`, and franchise users have materially different powers; role separation must be enforced on write and administrative actions.
- **Authenticated tenant -> other tenants** — franchise users must not read or modify another franchise's records, whether by query parameter, object ID, or missing filter conditions.
- **API -> PostgreSQL** — the API has direct access to all tenant data; authorization mistakes at the route layer become full data exposure.
- **API -> OpenAI / outbound services** — AI routes and notification/email services export application data outside the core trust boundary and must only include data the caller is authorized to access.
- **Public internet -> unauthenticated routes** — login, password reset, trial request, invite approval/rejection, health, and any public download endpoints are directly reachable because deployment visibility is public.

## Scan Anchors

- Production API entry points: `artifacts/api-server/src/app.ts`, `artifacts/api-server/src/routes/index.ts`, and route files under `artifacts/api-server/src/routes/`.
- Highest-risk areas: `routes/users.ts`, `routes/auth.ts`, `routes/invites.ts`, `routes/goals.ts`, `routes/checkins.ts`, `routes/support.ts`, `routes/planner.ts`, `routes/recruiting*.ts`, `routes/ai-*.ts`, `routes/journey.ts`.
- Public surfaces: auth, trial request, invite approval/rejection, health, franchise public listing, and download routes.
- Product-intended shared benchmarking surfaces: authenticated ranking and journey benchmarking features may intentionally expose network-level comparative or aggregated data; treat them as in scope only when they reveal raw tenant records, restricted admin views, or unauthorized underlying identifiers/details beyond the intended benchmark surface.
- Dev-only areas usually out of scope: `artifacts/mockup-sandbox/**`, local/mobile build scripts, and other non-production tooling unless explicitly reachable from the deployed API.

## Threat Categories

### Spoofing

The application relies on server-side sessions rather than bearer tokens. All protected routes must require a valid session and must not trust client-controlled role or franchise identifiers in place of server-side session state. Password reset and invite approval tokens must remain unguessable, single-purpose, and time-bounded.

### Tampering

Franchise users, regional staff, and admins can all submit writes that affect goals, check-ins, users, alerts, recruiting records, and planning data. The API must ensure that write operations only affect records the caller is authorized to manage, and that lower-privilege users cannot escalate privileges by supplying more powerful roles or target IDs.

### Information Disclosure

The highest disclosure risk is cross-franchise data leakage: dashboards, check-ins, progress history, recruiting records, AI prompts, and exports must always be filtered to the caller's authorized franchise set. Sensitive recruiting notes, candidate details, and business-performance history must never be retrievable solely by guessing numeric IDs or by omitting a tenant filter. Public routes must not expose internal artifacts or secrets.

### Denial of Service

Public flows such as login, forgot-password, trial requests, and any email- or AI-triggering endpoints are susceptible to abuse if they lack throttling or bounded resource consumption. Streaming AI routes and public email-triggering actions must not be invokable in ways that let unauthenticated or low-privilege users consume disproportionate backend resources.

### Elevation of Privilege

The application's security depends on strict separation among `master_admin`, `staff_regional`, franchise roles, and multi-franchise `socio` users. Server-side guarantees must ensure that only intended roles can create or promote privileged users, perform admin undo actions, manage other tenants, or access AI-assisted analyses built from restricted data. Any route that uses only object IDs, optional franchise filters, or client-submitted role values is a priority review target.
