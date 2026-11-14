import Link from "next/link";

type Page = "play" | "match" | "results";

export function SiteHeader({ page }: { page: Page }) {
  const links: { href: string; label: string; page: Page }[] = [
    { href: "/", label: "Play", page: "play" },
    { href: "/match", label: "Match preview", page: "match" },
    { href: "/results", label: "Results", page: "results" },
  ];
  return (
    <header className="border-b border-line bg-[#0d141d]">
      <div className="shell flex min-h-[68px] items-center gap-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="SystemWars home"><span className="grid h-9 w-9 place-items-center border border-flare bg-flare/10 text-flare display text-lg">SW</span><span className="display text-[21px] tracking-[.08em]">System<span className="text-flare">Wars</span></span></Link>
        <nav aria-label="Main navigation" className="ml-2 hidden h-[68px] items-center gap-8 sm:flex">{links.map(link => <Link key={link.page} href={link.href} aria-current={page === link.page ? "page" : undefined} className={`flex h-full items-center border-b-2 text-[11px] font-bold uppercase tracking-[.14em] transition-colors ${page === link.page ? "border-flare text-white" : "border-transparent text-muted hover:text-white"}`}>{link.label}</Link>)}</nav>
        <div className="ml-auto flex items-center gap-3"><span className="hidden text-[10px] font-bold uppercase tracking-[.16em] text-muted md:block">Season 00 / Design concept</span><span className="grid h-8 w-8 place-items-center border border-line bg-panel2 text-[10px] font-black text-sand">SW</span></div>
      </div>
      <nav aria-label="Mobile navigation" className="shell flex gap-6 pb-3 sm:hidden">{links.map(link => <Link key={link.page} href={link.href} aria-current={page === link.page ? "page" : undefined} className={`text-[10px] font-bold uppercase tracking-[.12em] ${page === link.page ? "text-flare" : "text-muted"}`}>{link.label}</Link>)}</nav>
    </header>
  );
}
