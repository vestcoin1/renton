# renton-api

This service is the backend boundary for the Renton app. It keeps all database access behind Prisma so the app can switch from Supabase to any Postgres-compatible host without changing the application logic.

## Prisma-first setup

- `apps/api/prisma/schema.prisma` defines the domain model and can be migrated to a new Postgres instance
- `apps/api/src/lib/prisma.ts` builds the Prisma client once per process
- `apps/api/src/services/database.service.ts` exposes the typed service layer used by the app
- The app keeps environment config in `apps/api/.env.example` and reads `DATABASE_URL` from the runtime environment

## Migration pattern

1. Point `DATABASE_URL` at the new database
2. Run `npm run db:push` for a quick schema sync, or `npm run db:migrate` for a proper migration flow
3. Generate the client with `npm run db:generate`
4. Keep the rest of the code reading from the service layer instead of calling the database directly

This makes Supabase optional, not mandatory: the only real provider dependency is the connection string and the database engine.

## Planned stack

- Node + TypeScript
- Prisma + Postgres
- Supabase Auth can still be used for auth, but the app logic does not depend on Supabase-specific database features
- Storage for photos and documents should use a provider-agnostic object store (Supabase Storage, S3, or a cloud bucket)
- Worker jobs can be added later for matching, reminders and notifications


