export function ContentPage({ eyebrow, title, intro, updated, children }: { eyebrow: string; title: string; intro?: string; updated?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="border-b bg-gradient-to-b from-brand-50 to-background dark:from-brand-900/30">
        <div className="container-page max-w-3xl py-14 sm:py-20">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">{title}</h1>
          {intro && <p className="mt-4 text-lg text-muted-foreground">{intro}</p>}
          {updated && <p className="mt-4 text-sm text-muted-foreground">Last updated {updated}</p>}
        </div>
      </div>
      <article className="container-page max-w-3xl space-y-8 py-12 text-[15px] leading-relaxed text-muted-foreground [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:space-y-1.5">
        {children}
      </article>
    </div>
  );
}
