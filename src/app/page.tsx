import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

function TopologyPreview() {
  return (
    <svg className="h-full w-full" viewBox="0 0 700 310" role="img" aria-label="Abstract architecture route for the Ticket onsale challenge">
      <defs>
        <pattern id="arena-grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M 28 0 L 0 0 0 28" fill="none" stroke="#e7ded2" strokeOpacity=".07" strokeWidth="1" /></pattern>
        <linearGradient id="route" x1="0" x2="1"><stop stopColor="#756b60" /><stop offset=".5" stopColor="#e5b77e" /><stop offset="1" stopColor="#756b60" /></linearGradient>
      </defs>
      <rect width="700" height="310" fill="url(#arena-grid)" />
      <path d="M32 155 H160 L205 93 H350 L395 155 H525 L568 112 H668" fill="none" stroke="#514a43" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M32 155 H160 L205 93 H350 L395 155 H525 L568 112 H668" fill="none" stroke="url(#route)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M160 155 L205 220 H350 L395 155" fill="none" stroke="#70675c" strokeWidth="2" strokeDasharray="5 8" />
      {[{ x: 85, y: 155, n: "01", name: "EDGE" }, { x: 276, y: 93, n: "02", name: "ROUTE" }, { x: 463, y: 155, n: "03", name: "COMPUTE" }, { x: 608, y: 112, n: "04", name: "DATA" }].map(node => <g key={node.n}><circle cx={node.x} cy={node.y} r="27" fill="#1b1d20" stroke="#dca667" strokeWidth="2" /><circle cx={node.x} cy={node.y} r="17" fill="#39322b" /><text x={node.x} y={node.y + 5} textAnchor="middle" fill="#f0e4d5" fontSize="12" fontWeight="700" fontFamily="monospace">{node.n}</text><text x={node.x} y={node.y + 50} textAnchor="middle" fill="#aaa59e" fontSize="10" fontWeight="700" letterSpacing="2">{node.name}</text></g>)}
      <circle cx="276" cy="220" r="15" fill="#1d1e22" stroke="#77716b" strokeDasharray="3 3" /><text x="276" y="225" textAnchor="middle" fill="#aaa59e" fontSize="13">+</text>
      <text x="30" y="34" fill="#aaa59e" fontFamily="monospace" fontSize="10" letterSpacing="2">SYSTEM PATH / PREVIEW</text>
      <text x="670" y="284" textAnchor="end" fill="#aaa59e" fontFamily="monospace" fontSize="10">SW–01</text>
    </svg>
  );
}

export default function LobbyPage() {
  return (
    <>
      <SiteHeader page="play" />
      <main className="mx-auto max-w-[1500px] px-4 pb-8 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-4">
          <div className="flex items-center gap-6 text-sm"><strong className="border-b-2 border-signal pb-4 -mb-4">Ranked</strong><span className="text-muted">Practice <small className="ml-1 text-[10px]">soon</small></span><span className="text-muted">Custom <small className="ml-1 text-[10px]">soon</small></span></div>
          <span className="font-mono text-[11px] text-muted">SEASON 00 <span className="mx-2 text-line">/</span> LOBBY PREVIEW</span>
        </div>

        <div className="grid min-h-[650px] border-x border-b border-line lg:grid-cols-[230px_minmax(0,1fr)_270px]">
          <aside className="border-b border-line bg-[#1a1d22] lg:border-r lg:border-b-0" aria-label="Player and rank">
            <div className="border-b border-line px-5 py-5"><span className="label text-muted">Player</span><div className="mt-5 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-md border border-line bg-panel2 text-sm font-extrabold">SW</span><div><strong className="block text-sm">Architect</strong><small className="text-muted">Solo party</small></div></div></div>
            <div className="border-b border-line px-5 py-6"><span className="label text-muted">Competitive rating</span><div className="mt-5 flex items-center gap-4"><span className="grid h-14 w-14 place-items-center rounded-full border border-copper/50 bg-copper/10 text-2xl text-copper">◇</span><div><strong className="block text-lg font-extrabold">Unranked</strong><small className="text-muted">Placement 0 of 5</small></div></div><div className="mt-5 h-[3px] bg-line"><div className="h-full w-0 bg-copper" /></div></div>
            <div className="px-5 py-6"><span className="label text-muted">Recent matches</span><p className="mt-5 text-xs leading-6 text-muted">No matches on record.</p></div>
          </aside>

          <section className="flex min-w-0 flex-col bg-[#121418]" aria-labelledby="mode-title">
            <div className="flex flex-wrap items-center justify-between gap-4 px-6 pt-7 sm:px-9"><div><span className="label text-muted">Matchmaking / Solo</span><h1 id="mode-title" className="display mt-1 text-4xl sm:text-5xl">Ranked 1v1</h1></div><span className="rounded border border-line px-3 py-1.5 font-mono text-[11px] text-muted">CHALLENGE 01</span></div>
            <div className="relative mx-6 mt-8 flex-1 overflow-hidden border border-line bg-[#1d2025] sm:mx-9"><div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,#73604b26,transparent_55%)]" /><div className="relative flex h-full min-h-[330px] items-center"><TopologyPreview /></div></div>
            <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 sm:px-9"><div className="flex items-center gap-3"><span className="h-2 w-2 rounded-full bg-signal" /><div><strong className="block text-xs">Solo queue ready</strong><span className="text-[11px] text-muted">Opponent joins when matchmaking is live</span></div></div><span className="font-mono text-[11px] text-muted">1 / 2 PLAYERS</span></div>
          </section>

          <aside className="flex flex-col border-t border-line bg-[#1a1d22] lg:border-t-0 lg:border-l" aria-label="Selected challenge">
            <div className="border-b border-line px-5 py-5"><span className="label text-muted">Selected challenge</span><h2 className="mt-4 text-xl font-extrabold leading-tight">Ticket onsale</h2><span className="mt-2 inline-block rounded border border-copper/40 px-2 py-1 text-[10px] font-bold text-copper">HIGH TRAFFIC</span></div>
            <div className="space-y-0 px-5"><div className="flex justify-between border-b border-line py-4 text-xs"><span className="text-muted">Concurrency</span><strong>100,000</strong></div><div className="flex justify-between border-b border-line py-4 text-xs"><span className="text-muted">Latency target</span><strong>P95 &lt; 250 ms</strong></div><div className="flex justify-between border-b border-line py-4 text-xs"><span className="text-muted">Failure test</span><strong>Server outage</strong></div><div className="flex justify-between border-b border-line py-4 text-xs"><span className="text-muted">Priority</span><strong>Seat integrity</strong></div></div>
            <div className="mt-auto border-t border-line px-5 py-5"><span className="label text-muted">Match conditions</span><p className="mt-3 text-xs leading-6 text-muted">Same challenge for both sides.</p></div>
          </aside>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-x border-b border-line bg-[#20242a] px-5 py-4 sm:px-7"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded border border-line bg-panel2 text-xs font-extrabold">SW</span><div><strong className="block text-xs">Solo party</strong><span className="text-[11px] text-muted">Ranked · 1v1</span></div></div><div className="flex flex-wrap items-center gap-4"><Link href="/about" className="text-xs text-muted hover:text-white">Game guide</Link><Link href="/match" className="primary-button min-w-[190px]">Preview match <span aria-hidden="true">→</span></Link></div></div>
      </main>
    </>
  );
}
