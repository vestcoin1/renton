# renton-admin

The verification team portal: overview, the property verification queue, identity (KYC) review, payments, rent installments, refunds, maintenance, users and reports.

It is a separate Next.js app with its own deployment, built with `basePath: "/admin"`. The web app proxies `/admin/**` to it, so the team uses it at **renton.ng/admin** (Next.js multi-zones).

## Run locally

```bash
npm run dev            # from the repo root: web on :3000 + admin on :3001
# open http://localhost:3000/admin   â† use this one
```

`npm run dev:admin` starts admin alone at http://localhost:3001/admin. Opened that way it is a different origin from the web app, so it can't see the session or demo data from :3000. Use the :3000 address to test flows that cross between portals.

## Data

Admin uses the same data layer as web: `renton-core` (store actions, hooks, auth, identity rules) and the `renton-ui` design system. When `apps/api` is built, those store actions become API calls. Web, admin and mobile then share one backend, and admin works from any domain.

Until then, the demo data lives in the browser's `localStorage`, which is why admin is served under the web domain.

## Deploy (e.g. Vercel)

1. Create a project for **apps/admin** (root directory `apps/admin`, install command `npm install` run at the repo root).
2. Deploy it. Note its URL, e.g. `https://renton-admin.vercel.app`.
3. In the **apps/web** project, set `ADMIN_URL=https://renton-admin.vercel.app` and redeploy. Web then serves admin at `/admin`.
4. Optional: to also open admin on its own domain (e.g. `admin.renton.ng/admin`), set `NEXT_PUBLIC_WEB_URL=https://renton.ng` on the admin project, so its links to the public site point at the right place. Until the API exists, that domain has its own separate demo data.

The two apps deploy independently. A change only in `apps/admin` doesn't require redeploying web, and vice versa, unless `packages/*` changed.

## Navigation between apps

Use full paths (`/admin/payments`, `/tenant`) with `ZoneLink` / `useZoneRouter` from `renton-ui/zone-link`. They use client-side navigation inside this app and a full page load when crossing to web. Plain `next/link` inside admin adds `/admin` itself, so `<Link href="/users">` also works for admin-only links.


