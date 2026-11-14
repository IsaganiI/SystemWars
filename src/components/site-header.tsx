import Link from "next/link";

type Page = "play" | "match";

export function SiteHeader({ page }: { page: Page }) {
  const links: { href: string; label: string; page: Page }[] = [
    { href: "/", label: "Play", page: "play" },
    { href: "/match", label: "Match preview", page: "match" },
  ];
  return (
    <header className="border-b border-line bg-[#0d1729]">
      <div className="shell flex min-h-[68px] items-center gap-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="SystemWars home"><span className="grid h-9 w-9 place-items-center rounded-md border border-signal/50 bg-signal/10 text-sm font-extrabold text-signal">SW</span><span className="display text-[20px] tracking-[-.05em]">System<span className="text-signal">Wars</span></span></Link>
        <nav aria-label="Main navigation" className="ml-2 hidden h-[68px] items-center gap-8 sm:flex">{links.map(link => <Link key={link.page} href={link.href} aria-current={page === link.page ? "page" : undefined} className={`flex h-full items-center border-b-2 text-[11px] font-bold uppercase tracking-[.14em] transition-colors ${page === link.page ? "border-signal text-white" : "border-transparent text-muted hover:text-white"}`}>{link.label}</Link>)}</nav>
        <div className="ml-auto flex items-center gap-3"><span className="grid h-8 w-8 place-items-center border border-line bg-panel2 text-[10px] font-black text-sand">SW</span></div>
      </div>
      <nav aria-label="Mobile navigation" className="shell flex gap-6 pb-3 sm:hidden">{links.map(link => <Link key={link.page} href={link.href} aria-current={page === link.page ? "page" : undefined} className={`text-[10px] font-bold uppercase tracking-[.12em] ${page === link.page ? "text-signal" : "text-muted"}`}>{link.label}</Link>)}</nav>
    </header>
  );
}
