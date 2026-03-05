// src/app/page.tsx
import Link from "next/link";

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5 flex-none" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7.7 13.6 4.6 10.5l-1.2 1.2 4.3 4.3L16.8 7l-1.2-1.2z"
      />
    </svg>
  );
}

function GlowBg() {
  // Pure CSS/SVG-ish glow background: fast + looks premium
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-cyan-400/25 blur-3xl" />
      <div className="absolute top-24 left-12 h-[420px] w-[420px] rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-[520px] w-[520px] rounded-full bg-emerald-400/15 blur-3xl" />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/75 to-slate-950/95" />
      <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)] bg-[linear-gradient(to_right,rgba(255,255,255,0.10)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.10)_1px,transparent_1px)] bg-[size:48px_48px] opacity-30" />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="text-sm text-slate-300">{label}</div>
      <div className="mt-1 text-xl font-semibold text-white">{value}</div>
    </div>
  );
}

function FeatureCard({
  title,
  desc,
  bullets,
}: {
  title: string;
  desc: string;
  bullets: string[];
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-sm">
      <div className="text-lg font-semibold text-white">{title}</div>
      <div className="mt-2 text-sm leading-6 text-slate-300">{desc}</div>
      <ul className="mt-5 space-y-2 text-sm text-slate-200">
        {bullets.map((b) => (
          <li key={b} className="flex gap-2">
            <span className="text-cyan-300">
              <CheckIcon />
            </span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PricingCard({
  name,
  price,
  blurb,
  items,
  ctaHref,
  featured,
}: {
  name: string;
  price: string;
  blurb: string;
  items: string[];
  ctaHref: string;
  featured?: boolean;
}) {
  return (
    <div
      className={[
        "relative rounded-3xl border p-6",
        featured
          ? "border-cyan-300/40 bg-white/10 shadow-[0_0_0_1px_rgba(34,211,238,0.25)]"
          : "border-white/10 bg-white/5",
      ].join(" ")}
    >
      {featured ? (
        <div className="absolute -top-3 left-6 rounded-full bg-cyan-500 px-3 py-1 text-xs font-semibold text-slate-950">
          Most popular
        </div>
      ) : null}

      <div className="text-lg font-semibold text-white">{name}</div>
      <div className="mt-2 text-3xl font-semibold text-white">{price}</div>
      <div className="mt-2 text-sm text-slate-300">{blurb}</div>

      <ul className="mt-5 space-y-2 text-sm text-slate-200">
        {items.map((i) => (
          <li key={i} className="flex gap-2">
            <span className="text-cyan-300">
              <CheckIcon />
            </span>
            <span>{i}</span>
          </li>
        ))}
      </ul>

      <Link
        href={ctaHref}
        className={[
          "mt-6 inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold",
          featured ? "bg-cyan-500 text-slate-950 hover:bg-cyan-400" : "bg-white/10 text-white hover:bg-white/15",
        ].join(" ")}
      >
        Start with {name}
      </Link>
    </div>
  );
}

export default function MarketingHome() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="relative">
        <GlowBg />

        {/* Nav */}
        <div className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-500" />
            <div className="text-base font-semibold tracking-tight">DQflow</div>
          </Link>

          <div className="hidden items-center gap-6 text-sm text-slate-200 md:flex">
            <a href="#how" className="hover:text-white">
              How it works
            </a>
            <a href="#features" className="hover:text-white">
              Features
            </a>
            <a href="#pricing" className="hover:text-white">
              Pricing
            </a>
            <Link href="/login" className="hover:text-white">
              Sign in
            </Link>
            <Link
              href="/meets"
              className="rounded-xl bg-cyan-500 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-400"
            >
              Create a meet
            </Link>
          </div>
        </div>

        {/* Hero */}
        <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-10 md:pt-16">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                <span className="h-2 w-2 rounded-full bg-cyan-400" />
                Live DQ feed • Role-based access • Built for mobile
              </div>

              <h1 className="mt-6 text-4xl font-semibold tracking-tight md:text-5xl">
                Instant DQ notifications.
                <span className="block text-slate-200">Zero clipboard chaos.</span>
              </h1>

              <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
                Officials submit a DQ once. Coaches see only their team. Parents track their swimmer’s races.
                Everyone stays informed — in real time.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/meets"
                  className="inline-flex items-center justify-center rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
                >
                  Create a meet
                </Link>
                <a
                  href="#pricing"
                  className="inline-flex items-center justify-center rounded-2xl bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15"
                >
                  View pricing
                </a>
              </div>

              <div className="mt-10 grid grid-cols-3 gap-3">
                <Stat label="Setup" value="2 min" />
                <Stat label="Join" value="QR link" />
                <Stat label="Roles" value="3" />
              </div>
            </div>

            {/* “Slick” mock card */}
            <div className="relative">
              <div className="rounded-[32px] border border-white/10 bg-gradient-to-b from-white/10 to-white/5 p-6 shadow-2xl">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-white">Live Meet Feed</div>
                  <div className="rounded-full bg-cyan-500/15 px-3 py-1 text-xs text-cyan-200">Coach view</div>
                </div>

                <div className="mt-4 space-y-3">
                  {[
                    { lane: "4", event: "12", heat: "2", swimmer: "A. Smith", code: "101.2", team: "GOLD" },
                    { lane: "6", event: "15", heat: "1", swimmer: "J. Lee", code: "102.3", team: "DYNA" },
                    { lane: "2", event: "18", heat: "3", swimmer: "M. Patel", code: "105.1", team: "GOLD" },
                  ].map((row, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-white">
                          Event {row.event} • Heat {row.heat} • Lane {row.lane}
                        </div>
                        <div className="text-xs text-slate-300">{row.team}</div>
                      </div>
                      <div className="mt-1 text-sm text-slate-300">{row.swimmer}</div>
                      <div className="mt-2 inline-flex rounded-lg bg-white/5 px-2 py-1 text-xs text-slate-200">
                        Infraction {row.code}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs font-semibold text-slate-200">Why it works</div>
                  <div className="mt-2 text-sm text-slate-300">
                    One source of truth. Role-filtered visibility. Fast mobile entry for officials.
                  </div>
                </div>
              </div>

              <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[40px] bg-cyan-400/10 blur-2xl" />
            </div>
          </div>
        </div>
      </div>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {[
            { t: "Create a meet", d: "Generate join links + QR codes for each role." },
            { t: "Join by role", d: "Officials, coaches, and parents join in seconds." },
            { t: "Real-time feed", d: "DQ entries flow instantly to the right people." },
          ].map((x) => (
            <div key={x.t} className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="text-base font-semibold">{x.t}</div>
              <div className="mt-2 text-sm text-slate-300">{x.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-2xl font-semibold tracking-tight">Built for every deck role</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <FeatureCard
            title="Officials"
            desc="Fast, accurate DQ entry — optimized for mobile."
            bullets={["Mobile-first DQ slip UI", "One submit = everyone updated", "Recorded status + audit trail"]}
          />
          <FeatureCard
            title="Coaches"
            desc="See your team only. React faster. Reduce confusion."
            bullets={["Team-filtered feed", "Consistent formatting", "No more chasing paperwork"]}
          />
          <FeatureCard
            title="Parents"
            desc="Track your swimmer’s races without spam."
            bullets={["Event/Heat/Lane watchlist", "Role-safe privacy (no initials)", "Mobile-friendly join"]}
          />
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold tracking-tight">Simple annual pricing</h2>
          <p className="text-sm text-slate-300">
            Start small. Upgrade as you host more meets.
          </p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <PricingCard
            name="Starter"
            price="$19.99/yr"
            blurb="1–2 meets per year"
            items={["Unlimited officials/coaches/parents", "Live DQ feed", "Role-based access"]}
            ctaHref="/billing/checkout?tier=starter"
          />
          <PricingCard
            name="Pro"
            price="$49.99/yr"
            blurb="3–5 meets per year"
            items={["Everything in Starter", "Priority support", "Meet templates (soon)"]}
            ctaHref="/billing/checkout?tier=pro"
            featured
          />
          <PricingCard
            name="Club"
            price="$79.99/yr"
            blurb="6–10 meets per year"
            items={["Everything in Pro", "Advanced exports (soon)", "Multi-admin (soon)"]}
            ctaHref="/billing/checkout?tier=club"
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-10 text-sm text-slate-300 md:flex-row md:items-center md:justify-between">
          <div>© {new Date().getFullYear()} DQflow</div>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <Link href="/contact" className="hover:text-white">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}