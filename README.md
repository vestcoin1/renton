# renton

A frontend prototype of a Nigerian property platform that connects tenants with verified landlords, covering verification, waiting-list matching, and landlord and admin tooling. It runs entirely on mock data, and every workflow is simulated in the browser.

## Quick start

```bash
npm install        # run from the repo root; installs every workspace
npm run dev        # web + admin; open http://localhost:3000 (admin at /admin, proxied from :3001)
npm run dev:web    # web only (/admin will not load)
npm run dev:mobile # Expo mobile app; press a for Android
npm run web:mobile # mobile app in a browser
npm run build      # production builds of web and admin (type-checks too)
npm run typecheck  # all workspaces
npm run verify     # simulated-backend workflow checks
```

**Accounts:** tenants and landlords create an account at `/signup` with their email and a password, then sign in at `/login`. The seeded demo accounts all use the password `demo1234`, and the login page has buttons that fill them in: **Tenant** (`chiamaka.eze@example.com`), **Landlord** (`ngozi.adeyemi@example.com`) and **Verification Team** (`ibrahim@renton.ng`). Portal URLs (`/tenant`, `/landlord`, `/admin`) redirect to `/login` when you are signed out, and to your own portal if you have a different role. Use the avatar menu to switch to a demo account or to **Reset demo data**. Resetting deletes accounts created during the demo.

Changes you make (applying, approving, verifying, marking vacancies, creating waiting lists) are saved to `localStorage` and carry across all three portals. For example:

1. As a **landlord**, add a property at `/landlord/properties/new`.
2. Switch to **admin**. The property appears in `/admin/verifications`. Schedule an inspection, mark it inspected, then click **Approve & publish**.
3. Switch back to **landlord**. The pipeline has moved forward and a notification is waiting.

## Tech stack

Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui (new-york, Radix primitives), Framer Motion, Lucide, Zustand, next-themes, and Sonner.

## Repository layout

One repo, several independently deployable apps (npm workspaces):

```
apps/
â”œâ”€ web/        Public site + tenant and landlord portals, deploys to Vercel
â”œâ”€ admin/      Verification team portal (/admin), its own deployment (see apps/admin/README.md)
â”œâ”€ api/        Backend for web, admin and mobile: Hono + Prisma (in progress, see apps/api/README.md)
â””â”€ mobile/     Expo app for iOS and Android (planned, see apps/mobile/README.md)
packages/
â”œâ”€ core/       Data layer + domain logic: store, hooks, auth, identity, fees, tenancy rules, mock data, zones
â”œâ”€ ui/         Design system: shadcn/ui primitives, theme (styles.css), DashboardShell and shared components
â””â”€ shared/     Domain types + reference data (cities, property types, budgets, amenities)
```

**Web and admin share one data layer.** Both apps read and write through `renton-core` (`store.ts` actions and `hooks.ts` selectors). When `apps/api` exists, each store action becomes one API call, used the same way by web, admin and mobile. Pages never import `renton-core/mock/*` directly; web server components use `apps/web/src/lib/services`.

**Admin is a separate Next.js app served under `/admin`** (Next.js multi-zones). It builds with `basePath: "/admin"`, and the web app rewrites `/admin/**` to wherever admin is deployed (`ADMIN_URL`). Both apps then share one domain, so they also share the signed-in session and the demo data in `localStorage`. Moving between the two apps needs a full page load, so shared code navigates with `ZoneLink` and `useZoneRouter` from `renton-ui/zone-link`. Both take full paths such as `/admin/payments` or `/tenant`.

## Web app structure (`apps/web`)

Shared building blocks (shadcn/ui primitives, DashboardShell, NotificationBell, UserMenu, payments and maintenance components, the store and domain logic) now live in `packages/ui` and `packages/core`. This tree shows what remains in the web app.

```
src/
â”œâ”€ app/
â”‚  â”œâ”€ (public)/            Marketing site + search (Navbar/Footer layout)
â”‚  â”‚  â”œâ”€ page.tsx          Home
â”‚  â”‚  â”œâ”€ properties/       Search (+ [id] details, SSG)
â”‚  â”‚  â”œâ”€ waiting-list/     Matching onboarding flow
â”‚  â”‚  â”œâ”€ diaspora/  become-a-landlord/  about/  contact/  privacy/  terms/
â”‚  â”œâ”€ login/  signup/      Email + password auth
â”‚  â”œâ”€ tenant/              Tenant portal  (dashboard, saved, applications, waiting-list, messages, profile)
â”‚  â”œâ”€ landlord/            Landlord portal (dashboard, properties, properties/new wizard, applications, tenants, vacancies)
â”œâ”€ components/
â”‚  â”œâ”€ layout/              Navbar, Footer
â”‚  â”œâ”€ identity/            Verification page + gate for applying/listing
â”‚  â”œâ”€ property/            PropertyCard (+skeleton), SaveButton, Gallery, ApplyDialog
â”‚  â”œâ”€ payments/            Payment-due banner, tenancy documents
â”‚  â”œâ”€ landlord/            Rent increase dialog + review panel
â”‚  â”œâ”€ maintenance/         New repair request dialog
â”‚  â”œâ”€ shared/              MatchScore, motion helpers
â”‚  â”œâ”€ waitlist/            Onboarding flow, WaitingListCard
â”‚  â”œâ”€ marketing/           Content page + browser frame
â”‚  â””â”€ search/              HeroSearch, FilterPanel, SearchView
â”œâ”€ lib/
â”‚  â”œâ”€ services/            â‡¢ Server-side data access (swap for the API)
â”‚  â”œâ”€ content.ts           Marketing copy (FAQs, testimonials)
â”‚  â”œâ”€ documents.ts         Tenancy agreement + receipt PDFs (jsPDF)
â”‚  â”œâ”€ matching.ts          Pure match-score engine (0â€“100 + reasons)
â”‚  â””â”€ search.ts            Filtering + URL param (de)serialisation
â””â”€ types/index.ts          Re-exports the domain model from renton-shared
```

## Accounts and identity verification

Tenants and landlords sign up with email and password (`packages/core/src/auth.ts`). Emails are case-insensitive and unique, passwords need at least 8 characters, and the same error is shown for an unknown email and a wrong password.

Every new account starts **unverified**. Until it is verified, a banner at the top of every portal page links to the verification page (`/tenant/verify`, `/landlord/verify`), and the sidebar shows a badge on **Verification**.

Tenants and landlords upload different documents. The requirements are defined in `packages/core/src/identity.ts` (`IDENTITY_REQUIREMENTS`):

| Tenant | Landlord |
|---|---|
| Government-issued ID (NIN, passport, driver's licence or voter's card) and its number | Government-issued ID and its number |
| Selfie holding the ID | Proof of address (utility bill or bank statement, last 3 months) |
| Proof of income (employment letter or 3 months' bank statement) | CAC certificate (optional, for companies) |

Property ownership documents (C of O, deed and so on) are still checked per listing in the property verification workflow below.

Flow: **Unverified â†’ documents submitted (*under review*) â†’ admin approves (*verified*) or rejects with a reason (*action needed*, so the user re-uploads).**

- Admins review submissions in `/admin/users` under the **ID review** tab. The notification link opens the submission directly.
- Tenants can't apply for a home and landlords can't add a property until they have submitted their documents. They can continue while the documents are under review.
- Seeded demo users predate document uploads, so they fall back to the `identityVerified` flag.

Notifications are stored per user, so each tenant or landlord sees only events about their own applications, properties and leases.

## Verification workflow

`Draft â†’ Submitted â†’ Inspection Scheduled â†’ Under Review â†’ Verified â†’ Published`

The pipeline is defined once in `packages/core/src/status.ts` (`VERIFICATION_FLOW`). It is drawn by `<VerificationFlow variant="full | compact | vertical" />`, which appears on property details, the landlord dashboard and properties table, the add-property wizard, the admin queue and review pages, and the marketing pages. `changes_requested` and `rejected` branch off from *Under Review*.

## Waiting-list matching

`lib/matching.ts â†’ scoreMatch(prefs, property)` weights area (30), budget (30), property type (15), bedrooms (15) and availability (10). It returns a score plus the reasons behind it, such as "âœ“ Preferred area Â· âœ“ Within budget Â· âœ“ Available immediately". Results appear through `<MatchRing>` and `<MatchScoreCard>`. The function is pure, so it can move to a Postgres function or Edge Function as is.

## Move-in payment and tenancy documents

When a landlord approves an application, renton raises a **move-in invoice** (`packages/core/src/fees.ts`) and the tenant is notified to pay:

| Item | Amount |
|---|---|
| Rent | annual rent Ã— lease years |
| Caution deposit (refundable) | the property's caution deposit |
| Agency fee | 10% of the rent |

Service charge isn't included; it is paid separately to the estate.

Flow: **Approved â†’ tenant pays renton by bank transfer â†’ uploads the receipt (image or PDF) â†’ admin verifies in `/admin/payments` â†’ tenancy starts.**

- If the admin rejects a receipt (with a reason), the tenant re-uploads it.
- On verification, a lease is created from the agreed move-in date and term, and the property is marked **occupied**. Other pending applications for that home are closed, and the tenant and landlord are notified.
- The **tenancy agreement** and **payment receipt** appear under *Tenancy documents* in `/tenant/profile` and download as PDFs. They are generated client-side with jsPDF (`lib/documents.ts`) and loaded only when a download is clicked.

The bank details and agreement wording are placeholders. A Nigerian lawyer must review the agreement template before it is used.

## Rent installments

Tenants with a lease can pay their next annual rent in installments instead of all at once. Every installment goes to renton's account, and renton pays the landlord only once the full rent has been paid.

Flow: **tenant starts a plan (monthly or any amount) â†’ transfers money with the plan reference and uploads the receipt â†’ admin confirms each installment in `/admin/rent` â†’ once confirmed payments cover the rent, admin pays the landlord.**

- The target is the rent for the next term: the agreed rent from a rent review, otherwise the current rent (`nextTermRent` in `packages/core/src/tenancy-rules.ts`). It is fixed at payout.
- Installments must be at least â‚¦5,000 (`MIN_INSTALLMENT`). The last one can be smaller so the tenant can clear the balance. Installments awaiting verification count against the balance, so tenants can't overpay.
- Rejected receipts don't count towards the rent. The tenant is told why and can pay again.
- The store blocks payout until the rent is fully paid, and a plan can only be paid out once.
- A tenant who has given move-out notice can't start a plan or add installments.
- The tenant sees progress on Payments and My Home. The landlord sees it on Tenants, and both are notified when the landlord is paid.

## Rent increases and caution refunds

The rules live in `packages/core/src/tenancy-rules.ts`:

| Rule | Value |
|---|---|
| Minimum notice before a rent increase (`RENT_NOTICE_DAYS`) | 90 days (3 months) before the tenancy expires |
| Caution refund wait after move-out notice (`REFUND_WAIT_DAYS`) | 30 days |

**Rent increases** (landlord â†’ Tenants â†’ *Increase rent*, for one tenant or for all):

- **Current tenants** who have moved in get a negotiable proposal, but only if at least 3 months remain on their tenancy. Leases with less time left are listed with the reason and skipped. The tenant can accept or counter on My Home, and the landlord can accept the counter, send a revised offer or withdraw the increase. The agreed rent is shown to the tenant as the amount to pay and applies when the lease renews.
- **New tenants who haven't moved in** can't negotiate. For a lease that hasn't started yet, the new rent is fixed for the next term. For an approved applicant who hasn't paid yet, the move-in invoice is re-priced at the full new rent and the listing price is updated.

**Caution refunds:** after giving move-out notice, the tenant requests a refund on My Home and enters their bank details. Admin approves it in `/admin/refunds`, with an optional deduction and reason from the check-out inspection, then marks it paid. Approval is blocked until 30 days after the notice, and the store enforces this rule as well as the UI.

## Mobile

Every route was audited at 390px width with no horizontal overflow. The dashboards have a bottom tab bar on phones, with four key destinations plus *More*, and live badges. The tab bar respects the iOS safe area. Tab rows scroll sideways and wide tables collapse their columns.

## Tenancy: repairs, rent countdown and end-of-lease decisions

Tenants with an active lease (the demo tenant lives in Flat 3B, Wuse 2) get **My Home** and **Repairs** in their portal.

**Repair pipeline:** `Reported â†’ Investigation (admin) â†’ Landlord approval â†’ Technician dispatched â†’ Fixed`

| Step | Who | Where |
|---|---|---|
| Report the problem with photos and videos, category, room and urgency | Tenant | `/tenant/repairs` |
| Start the investigation, then send findings, the recommended fix and a cost estimate | Admin | `/admin/maintenance` |
| Approve or decline, with a note | Landlord | `/landlord/maintenance` (also shown under *Action needed* on the dashboard) |
| Dispatch a vetted technician (suggested by trade) with a visit time | Admin | `/admin/maintenance` |
| Mark the job completed, then the tenant rates it | Admin â†’ Tenant | both |

Each step notifies the other parties and adds an entry to the request's timeline. Photos are compressed into data URLs so they persist in the demo. Videos play during the session but don't survive a page reload, because real files will need Supabase Storage.

**Rent countdown:** a live countdown to the next annual rent due date (the end of the term) appears on My Home and on the tenant dashboard. It turns amber within 60 days and red within 14 days.

**Renew or move out:** the tenant picks *Renew* (1â€“3 years) or *Move out* (date and reason). The landlord sees the request on the Tenants page and dashboard. Accepting a renewal extends the lease, and acknowledging a move-out lists the home as *available soon* for waiting-list tenants.

Run `npm run verify` to exercise these workflows end to end against the store.

## Supabase migration

The UI never imports mock arrays directly for data it renders. Instead:

| Layer | Today | With Supabase |
|---|---|---|
| Server reads (`lib/services`) | resolves mock data | `supabase.from(...).select()` in each function |
| Client mutations (`renton-core/store` actions, used by web and admin) | mutates Zustand state | each action calls an RPC / insert / update, then revalidates |
| Auth (`renton-core/auth`, `/login`, `/signup`, `DashboardShell` guard) | salted SHA-256 hashes in the persisted store | `supabase.auth.signUp` / `signInWithPassword` + `profiles.role`; replace guard with middleware |
| Identity documents | data URLs in the store | private Supabase Storage bucket, readable only by admins |
| Images | Unsplash URLs | Supabase Storage bucket (add host in `next.config.ts`) |
| Matching | `lib/matching.ts` | same function in an Edge Function / pg function, triggered on publish |

Suggested tables, which mirror `src/types`: `profiles`, `properties`, `payment_invoices`, `payment_receipts`, `rent_reviews`, `rent_offers`, `caution_refunds`, `tenancy_documents`, `maintenance_requests`, `maintenance_media`, `maintenance_events`, `technicians`, `property_images`, `verification_requests`, `verification_documents`, `verification_checklist_items`, `verification_notes`, `applications`, `waiting_lists`, `leases`, `reports`, `notifications`, `message_threads`, `messages`. Use RLS policies keyed by `auth.uid()` and `profiles.role` for tenant, landlord and admin scoping.

Copy `.env.example` to `.env.local` when you wire up the backend.

## Notes

- Platform-wide totals on the admin overview (for example, 12k users) are illustrative. The live mock entities are added on top of them, so actions still change the numbers.
- Legal pages contain placeholder copy, which counsel must review before launch.
- Light and dark mode follow the OS by default. Use the sun/moon toggle to switch manually.


