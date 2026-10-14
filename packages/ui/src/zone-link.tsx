"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import { crossZoneUrl, isLocalPath, toFullPath, toZoneHref } from "renton-core/zones";

type ZoneLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; prefetch?: boolean };

/** A link that takes a full path ("/admin/payments", "/tenant") and works from either zone. */
export function ZoneLink({ href, prefetch, ...props }: ZoneLinkProps) {
  if (isLocalPath(href)) return <Link href={toZoneHref(href)} prefetch={prefetch} {...props} />;
  // Another zone (or an external URL): a plain anchor makes the browser load it from that app.
  return <a href={crossZoneUrl(href)} {...props} />;
}

/** router.push / replace for full paths, switching zones with a full page load when needed. */
export function useZoneRouter() {
  const router = useRouter();
  return useMemo(
    () => ({
      push: (path: string) => (isLocalPath(path) ? router.push(toZoneHref(path)) : window.location.assign(crossZoneUrl(path))),
      replace: (path: string) => (isLocalPath(path) ? router.replace(toZoneHref(path)) : window.location.replace(crossZoneUrl(path))),
    }),
    [router]
  );
}

/** The current page as a full path (includes "/admin" in the admin zone). */
export function useFullPathname() {
  return toFullPath(usePathname());
}


