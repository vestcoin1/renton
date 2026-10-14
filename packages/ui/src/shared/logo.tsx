import { ZoneLink as Link } from "../zone-link";
import { cn } from "renton-core/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 80" className={cn("size-10", className)} aria-hidden>
      <defs>
        <linearGradient id="renton-mark-gradient" x1="8" x2="72" y1="10" y2="74" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0B2340" />
          <stop offset="0.52" stopColor="#0F4C81" />
          <stop offset="1" stopColor="#10B981" />
        </linearGradient>
      </defs>
      <rect x="6" y="6" width="68" height="68" rx="20" fill="url(#renton-mark-gradient)" />
      <path d="M24 35 40 22l16 13v18.5A4.5 4.5 0 0 1 51.5 58h-23A4.5 4.5 0 0 1 24 53.5V35Z" fill="rgba(255,255,255,0.12)" stroke="#EAFDF7" strokeWidth="3" strokeLinejoin="round" />
      <path d="M31 33.5V56h7.5v-8h7.4c6 0 10.6-3.8 10.6-9.1 0-5.3-4.6-9.1-10.6-9.1H31Zm7.5 7.3h5.2c3 0 5.1 1.7 5.1 4.1 0 2.4-2.1 4.1-5.1 4.1h-5.2v-8.2Z" fill="#F8FFFD" />
      <path d="M49 33.5 58.5 56h-7.2L41.9 33.5H49Z" fill="#B9F7D8" />
      <path d="M42 45.5h7.3" stroke="#B9F7D8" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className, href = "/", light }: { className?: string; href?: string; light?: boolean }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2.5 rounded-lg", className)} aria-label="renton home">
      <LogoMark />
      <span className={cn("font-display text-lg font-black tracking-tight", light ? "text-white" : "text-foreground")}>
        <span>Rent</span>
        <span className={light ? "ml-0.5 text-emerald-300" : "ml-0.5 text-primary"}>On</span>
      </span>
    </Link>
  );
}


