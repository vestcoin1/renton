# renton-api

The backend for web, admin and mobile. It's a Hono HTTP server, and Prisma is its only way into Postgres.

**Architecture:** Supabase provides Postgres, Auth and Storage. All business rules live here, so every client gets the same behaviour, and the provider can be swapped by changing connection strings. Responses use the `renton-shared` domain types the apps already render. Rules such as fees, tenancy rules, matching and search filters are imported from `renton-core`, not copied.

## Quick start

```bash
cp apps/api/.env.example apps/api/.env   # once (DEV_AUTH=true for local sign-in without Supabase)
npm run db:up        # local Postgres in Docker on :54329 (databases: renton, renton_test)
npm run db:migrate   # apply migrations to the dev database
npm run db:seed      # load the frontend's mock data (truncates every table first)
npm run dev:api      # http://localhost:4000/health
npm run test:api     # rebuilds renton_test from the migrations, then runs Vitest
```

Local sign-in: `POST /v1/dev/session {"role":"tenant"}` returns a token for the demo tenant. You can also pass `profileId` or `email`, or call `POST /v1/dev/signup`. Send the token as `Authorization: Bearer <token>`.

## Connecting a Supabase project

1. **Settings:** in `apps/api/.env`, set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Set `SUPABASE_JWT_SECRET` too if the project still uses legacy HS256 signing.
2. **Database:** set `DATABASE_URL` to the project's pooled connection string, then run `npm run prisma:deploy -w renton-api`.
3. **Storage:** run `npm run supabase:setup -w renton-api -- buckets` to create the five Storage buckets. Only `property-images` is public.
4. **Demo logins (optional):** run `npm run supabase:setup -w renton-api -- demo-users`. It creates logins with the password `demo1234` for the seeded profiles. It isn't allowed in production.

How users get in: the client signs up or signs in with `supabase-js`, then sends the access token. A new account calls `POST /v1/me {role, name, phone, city}` once to create its profile. Until it does, other endpoints return `403 profile_required`.

How file uploads work: `POST /v1/uploads` returns a signed upload URL and a `ref` (`storage:<bucket>/<owner>/<file>`). Upload the file with `PUT`, then attach the `ref` to the record. Private files come back as short-lived signed URLs, and only to people allowed to see them. Without Storage configured (local development), inline `data:` URLs are accepted, as in the prototype.

## Deploying (Render)

[render.yaml](../../render.yaml) at the repo root defines the service. Docker isn't involved; Render builds from the repo.

1. Render dashboard → **New → Blueprint**, then pick this repo and the branch to deploy.
2. Fill in the prompted values: `DATABASE_URL` (Supabase **Session pooler** string), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CORS_ORIGINS`.
3. Each build runs `prisma migrate deploy`, which applies new migrations to Supabase. It never resets data.
4. Run `npm run db:seed` from your machine against the Supabase `DATABASE_URL` only if you want the demo data there. To create the storage buckets, run `npm run supabase:setup -- buckets` the same way.

The free instance sleeps after ~15 minutes idle. Change `plan` to `starter` for always-on.

## Endpoints (`/v1`)

| Area | Endpoints |
|---|---|
| Account | `GET/POST/PATCH /me` · `POST /me/identity` · `POST /uploads` · `GET /notifications` · `POST /notifications/:id/read` · `POST /notifications/read-all` |
| Public | `GET /properties` (web search params) · `/properties/featured` · `/properties/:id` · `/properties/:id/similar` · `GET /cities` · `GET /landlords/:id` |
| Tenant | `GET/PUT/DELETE /me/saved[/:propertyId]` · `/tenant/applications` · `/tenant/waiting-lists[/:id/matches]` · `GET /tenant/tenancy` · `POST /tenant/invoices/:id/receipt` · `PUT/DELETE /tenant/leases/:id/intent` · `POST /tenant/leases/:id/{rent-review/respond, refund, rent-plan}` · `PATCH /tenant/rent-plans/:id` · `POST /tenant/rent-plans/:id/contributions` · `/tenant/maintenance[/:id/rating]` |
| Landlord | `/landlord/properties` (+ `PATCH /:id`, `/:id/submit`, `/:id/occupancy`, `/:id/verification`, `/:id/documents`) · `GET /landlord/applications` · `POST /landlord/applications/:id/decision` · `GET /landlord/tenancy` · `POST /landlord/rent-increases` · `POST /landlord/properties/:id/rent` · `POST /landlord/leases/:id/{rent-review/respond, intent/respond}` · `/landlord/maintenance[/:id/decision]` |
| Admin | `GET /admin/overview` · `/admin/users` (+ `/:id/identity-review`) · `/admin/verifications` (+ checklist, notes, documents) · `POST /admin/properties/:id/stage` · `/admin/invoices` (+ verify/reject) · `/admin/refunds` (+ approve/paid) · `/admin/rent-plans` (+ installment verify/reject, payout) · `/admin/maintenance` (+ investigate/report/dispatch/complete) · `/admin/technicians` · `/admin/reports` |
| Shared | `/threads` (messages) · `POST /reports` · `GET /invoices/:id` (tenancy-document context) |

The typed client in `packages/api-client` (`renton-api-client`) has one method per endpoint.

## Conventions

- **Error format.** Every error response looks like `{ error: { code, message, details?, requestId } }`. When a business rule blocks an action, the API returns `422` with a specific code: `refund_not_eligible`, `below_minimum`, `invalid_transition`, `identity_required` and so on. A lost race returns `409 stale_state`.
- **No double-processing.** State changes (verify payment, payout, approve refund, repair steps) use conditional updates inside transactions, so two admins acting at once can't verify a payment twice or pay out a plan twice. Installments lock the plan row while the balance is re-checked.
- **Business clock.** `deps.now()` drives every time-based rule. Tests pin it near the mock data's anchor date, so notice periods and refund waits behave the same on any day.
- **Who sees what.** Landlords never see tenants' bank details or receipt files. Admins' internal verification notes are hidden from landlords. Other people's contact details are blank on public profiles.
- **IDs.** Seeded rows keep their mock IDs, such as `p-lek-001`. New rows get cuids.

## Phases

| # | Scope | Status |
|---|---|---|
| 0 | Foundations: server, schema, migrations, seed, tests | ✅ |
| 1 | Supabase Auth logins checked by the API, profiles, role checks, identity (KYC), storage uploads, dev sign-in, typed API client | ✅ |
| 2 | Properties, search, verification pipeline, waiting-list matches on publish | ✅ |
| 3 | Saved homes, applications, waiting lists, matching | ✅ |
| 4 | Invoices and receipts, leases, rent plans, caution refunds, rent reviews, renew/move-out | ✅ |
| 5 | Maintenance and technicians, reports, messaging, admin overview | ✅ |
| 6 | Switching web, admin and mobile to the API (`DATA_SOURCE`), deployment | |
