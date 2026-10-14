/**
 * renton is served as two Next.js "zones" on one domain:
 *   - web   (apps/web)   â†’ everything except /admin
 *   - admin (apps/admin) â†’ /admin/** (basePath "/admin"), deployed separately and proxied by web's rewrites
 *
 * Paths in data (notification links, ROLE_HOMEâ€¦) are always full paths like "/admin/payments".
 * Inside a zone, next/link and the router only reach that zone's pages, and the admin zone adds its
 * basePath itself, so cross-zone navigation must be a full page load. `ZoneLink` / `useZoneRouter`
 * in renton-ui apply these rules.
 */
export type Zone = "web" | "admin";

export const ADMIN_BASE_PATH = "/admin";

/** Set per app in next.config (`env.NEXT_PUBLIC_ZONE`). */
export const CURRENT_ZONE: Zone = process.env.NEXT_PUBLIC_ZONE === "admin" ? "admin" : "web";

export const zoneOf = (path: string): Zone => (path === ADMIN_BASE_PATH || path.startsWith(`${ADMIN_BASE_PATH}/`) || path.startsWith(`${ADMIN_BASE_PATH}?`) ? "admin" : "web");

/** True when `path` is served by the app this code is running in (client-side navigation works). */
export const isLocalPath = (path: string) => !/^[a-z]+:/i.test(path) && zoneOf(path) === CURRENT_ZONE;

/** Converts a full path into the href next/link expects in this zone (the admin zone adds "/admin" itself). */
export const toZoneHref = (path: string) => (CURRENT_ZONE === "admin" && zoneOf(path) === "admin" ? path.slice(ADMIN_BASE_PATH.length) || "/" : path);

/**
 * Origin of the web app as seen from the admin zone. Empty when admin is served under the web
 * domain (the normal setup), set to e.g. "https://renton.ng" when admin is opened on its own domain.
 */
const WEB_ORIGIN = (process.env.NEXT_PUBLIC_WEB_URL ?? "").replace(/\/$/, "");

/** URL for a path served by another zone (or an external URL, unchanged). */
export const crossZoneUrl = (path: string) => (/^[a-z]+:/i.test(path) || CURRENT_ZONE === "web" ? path : `${WEB_ORIGIN}${path}`);

/** Each zone signs people in on its own page, so admin also works when hosted on its own domain. */
export const LOGIN_PATH = CURRENT_ZONE === "admin" ? `${ADMIN_BASE_PATH}/login` : "/login";

/** Where signing out lands. */
export const SIGNED_OUT_PATH = CURRENT_ZONE === "admin" ? LOGIN_PATH : "/";

/** Converts a zone-relative pathname (from usePathname) back into a full path. */
export const toFullPath = (pathname: string) => (CURRENT_ZONE === "admin" ? `${ADMIN_BASE_PATH}${pathname === "/" ? "" : pathname}` : pathname);


