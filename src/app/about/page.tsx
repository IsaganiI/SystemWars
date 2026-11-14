import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

const phases = [
  { number: "01", title: "Match", description: "Queue into a 1v1 match. Both players receive the same challenge and test conditions." },
  { number: "02", title: "Build", description: "Create an architecture by placing infrastructure components and connecting the request path." },
  { number: "03", title: "Simulate", description: "Both designs face the same traffic spike and failures. The simulation uses fixed inputs so the comparison is fair." },
  { number: "04", title: "Compare", description: "See latency, throughput, reliability, and correctness side by side. Wins advance your rank." },
];

const metrics = [
  ["Latency", "How quickly the system responds at peak load."],
  ["Throughput", "How many requests it serves successfully."],
  ["Reliability", "Whether checkout stays available through failures."],
  ["Correctness", "Whether the system protects data and meets the challenge rules."],
];

export default function AboutPage() {
  return <><SiteHeader page="about" /><main className="shell pb-20">
    <header className="max-w-3xl py-12 sm:py-16"><span className="label text-copper">The game guide</span><h1 className="display mt-4 text-[clamp(42px,6vw,72px)] leading-[1.08]">System design is the competition.</h1><p className="mt-6 text-base leading-8 text-muted">SystemWars is a competitive architecture game. Two players solve the same infrastructure problem under pressure, then compare how their systems perform in a deterministic simulation.</p><Link href="/match" className="primary-button mt-8">Explore a sample match <span>↗</span></Link></header>
    <section className="panel overflow-hidden" aria-labelledby="how-heading"><div className="flex items-center justify-between border-b border-line px-6 py-5"><h2 id="how-heading" className="text-lg font-extrabold">How a match works</h2><span className="label text-muted">1v1 ranked</span></div><div className="grid md:grid-cols-2 xl:grid-cols-4">{phases.map(phase => <div key={phase.number} className="border-b border-line p-6 last:border-0 md:border-r md:[&:nth-child(2)]:border-r-0 xl:border-b-0 xl:[&:nth-child(2)]:border-r"><span className="font-mono text-sm text-signal">{phase.number}</span><h3 className="display mt-4 text-2xl">{phase.title}</h3><p className="mt-3 text-xs leading-6 text-muted">{phase.description}</p></div>)}</div></section>
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]"><section className="panel p-6" aria-labelledby="scoring-heading"><span className="label text-copper">Fair by design</span><h2 id="scoring-heading" className="display mt-3 text-3xl">What decides a win?</h2><p className="mt-3 max-w-xl text-sm leading-7 text-muted">Each architecture runs against identical workloads and failure tests. The result shows the underlying metrics so players can understand the outcome and improve their next build.</p><div className="mt-6 grid gap-3 sm:grid-cols-2">{metrics.map(([name, detail]) => <div key={name} className="rounded-lg border border-line bg-panel2 p-4"><strong className="text-sm">{name}</strong><p className="mt-2 text-xs leading-5 text-muted">{detail}</p></div>)}</div></section><aside className="panel p-6"><span className="label text-muted">The first challenge</span><h2 className="display mt-4 text-3xl">Ticket onsale</h2><p className="mt-3 text-xs leading-6 text-muted">A concert sale brings 100,000 concurrent users to browse and check out. Your design has to protect seat inventory, survive failures, and keep checkout consistent.</p><div className="mt-6 border-t border-line pt-5 text-xs"><div className="flex justify-between"><span className="text-muted">Concurrent users</span><strong>100,000</strong></div><div className="mt-4 flex justify-between"><span className="text-muted">Primary risk</span><strong>Overselling seats</strong></div></div><Link href="/results" className="mt-8 inline-block text-xs font-bold text-signal hover:text-white">View comparison concept →</Link></aside></div>
    <p className="mt-8 text-xs text-muted">Current status: these screens are a design prototype. Real matchmaking, editor interaction, simulation, and ranked progression are planned development work.</p>
  </main></>;
}
