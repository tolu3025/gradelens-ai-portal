import { createFileRoute, Link } from "@tanstack/react-router";
import { AppNav } from "@/components/AppNav";
import { Icon3d } from "@/components/Icon3d";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Grade Lens — Student CGPA & Counseling Portal" },
      { name: "description", content: "An Apple-clean portal for tracking CGPA, viewing grades, and managing counselor referrals." },
      { property: "og:title", content: "Grade Lens" },
      { property: "og:description", content: "CGPA, grades, and counselor referrals — beautifully organized." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <AppNav role={null} />

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-12 md:pt-20">
        <section className="text-center animate-[fade-in_0.6s_ease-out]">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-[12px] text-muted-foreground backdrop-blur">
            <span className="size-1.5 rounded-full bg-success" />
            Live with your academic record
          </div>

          <div className="mt-6 flex items-center justify-center gap-3">
            <Icon3d name="cap" size={64} priority />
            <Icon3d name="sparkle" size={36} className="-mt-6" />
          </div>

          <h1 className="mt-4 text-5xl font-bold leading-[1.02] tracking-tight md:text-7xl">
            <span className="text-gradient">Your CGPA,</span>
            <br />
            <span className="text-gradient">clarified.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
            A single, beautifully minimal place to follow your performance and stay close to your counselor — built for students who care about the details.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/auth"
              className="group inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              Open your portal
              <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#features"
              className="rounded-full border border-border bg-surface/50 px-5 py-3 text-sm font-medium hover:bg-accent"
            >
              See what's inside
            </a>
          </div>
        </section>

        <section className="mt-16 md:mt-20">
          <CgpaHeroCard />
        </section>

        <section id="features" className="mt-24 grid gap-4 md:grid-cols-3">
          <Feature icon="chart" title="Live CGPA" body="Weighted points, credit units, and classification — always up to date." />
          <Feature icon="people" title="Counselor referrals" body="When grades dip, your counselor is one tap away. Track meetings and deadlines." />
          <Feature icon="shield" title="Role-based access" body="Students see their own record. Counselors see their referrals. Admins see everything." />
        </section>

        <section className="mt-24 grid gap-4 md:grid-cols-2">
          <BigCard
            icon="trophy"
            title="A leaderboard worth chasing"
            body="See where you stand against your peers. Motivation, made playful."
            cta="Explore leaderboard"
            to="/leaderboard"
          />
          <BigCard
            icon="sparkle"
            title="Trends that tell a story"
            body="Watch your semester-over-semester growth in one elegant line."
            cta="View your trends"
            to="/trends"
          />
        </section>
      </main>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Grade Lens
      </footer>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: "chart" | "people" | "shield"; title: string; body: string }) {
  return (
    <div className="card-elevated group rounded-3xl p-6 transition hover:-translate-y-0.5">
      <Icon3d name={icon} size={56} />
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function BigCard({ icon, title, body, cta, to }: {
  icon: "trophy" | "sparkle"; title: string; body: string; cta: string; to: string;
}) {
  return (
    <Link to={to} className="card-elevated group relative overflow-hidden rounded-[28px] p-8 transition hover:-translate-y-0.5">
      <div
        aria-hidden
        className="absolute -right-16 -bottom-16 size-64 rounded-full opacity-50 blur-3xl"
        style={{ background: "radial-gradient(closest-side, oklch(0.78 0.16 210 / 0.5), transparent)" }}
      />
      <div className="relative">
        <Icon3d name={icon} size={72} />
        <h3 className="mt-5 text-2xl font-semibold tracking-tight">{title}</h3>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">{body}</p>
        <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
          {cta} <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}

function CgpaHeroCard() {
  return (
    <div className="card-elevated relative mx-auto max-w-3xl overflow-hidden rounded-[28px] p-8 md:p-10">
      <div
        aria-hidden
        className="absolute -right-24 -top-24 size-72 rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(closest-side, oklch(0.7 0.18 250 / 0.55), transparent)" }}
      />
      <div className="relative grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Current CGPA</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-7xl font-bold tracking-tight text-gradient">4.62</span>
            <span className="text-sm text-muted-foreground">/ 5.00</span>
          </div>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-success/15 px-3 py-1 text-xs font-medium text-success">
            First Class · Above Average
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center md:text-left">
          <Stat label="Credit units" value="142" />
          <Stat label="Weighted pts" value="657" />
          <Stat label="Level" value="400" />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/60 px-4 py-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
