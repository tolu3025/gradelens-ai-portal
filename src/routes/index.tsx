import { createFileRoute, Link } from "@tanstack/react-router";
import { AppNav } from "@/components/AppNav";
import { Icon3d } from "@/components/Icon3d";
import { ArrowRight, BrainCircuit, ShieldAlert, TrendingUp, UserCheck, Sparkles, CheckCircle2, Award } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Grade Lens — AI-Powered Academic Early Warning & Counseling Portal" },
      { name: "description", content: "AI-driven academic risk prediction, CGPA forecasting, trend analysis, and automated counselor intervention." },
      { property: "og:title", content: "Grade Lens — AI Early Warning System" },
      { property: "og:description", content: "Predict student academic risk with Decision Trees and Linear Regression forecasting." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const [activeRiskTab, setActiveRiskTab] = useState<"high" | "medium" | "low">("high");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNav role={null} />

      <main className="mx-auto max-w-6xl px-4 pb-28 pt-12 md:pt-20">
        {/* HERO SECTION */}
        <section className="text-center animate-[fade-in_0.6s_ease-out]">
          <div className="mt-4 flex items-center justify-center">
            <img src="/logo.png" alt="GradeLens Logo" className="size-24 object-contain rounded-2xl shadow-xl border border-primary/20" />
          </div>

          <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight md:text-6xl text-gradient">
            Predict Academic Risk.
            <br />
            Empower Student Success.
          </h1>
          
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground md:text-lg leading-relaxed">
            GradeLens uses Decision Tree classifiers and Linear Regression forecasting to detect academic risk early, forecast next semester GPAs, and trigger automated counselor referrals.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/auth"
              className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg transition hover:opacity-95 hover:shadow-primary/25"
            >
              Access Portal Now
              <ArrowRight className="size-4 transition group-hover:translate-x-1" />
            </Link>
            <a
              href="#ai-features"
              className="rounded-full border border-border bg-card px-6 py-3.5 text-sm font-medium hover:bg-accent transition"
            >
              Explore AI Architecture
            </a>
          </div>
        </section>

        {/* METRICS & STATS BAR */}
        <section className="mt-16 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatBox label="Model Accuracy" value="99.58%" sub="Trained on 1,200 Student Profiles" />
          <StatBox label="F1-Score" value="0.9958" sub="Weighted Machine Learning Metric" />
          <StatBox label="CGPA Forecasting" value="Linear Reg." sub="Least-Squares Trend Analysis" />
          <StatBox label="Auto-Referrals" value="Real-time" sub="Automatic Counselor Interventions" />
        </section>

        {/* LIVE AI PREDICTION DEMO INTERACTION */}
        <section className="mt-20">
          <div className="card-elevated relative overflow-hidden rounded-[32px] p-8 md:p-12 border border-primary/20 bg-card">
            <div
              aria-hidden
              className="absolute -right-32 -top-32 size-96 rounded-full opacity-40 blur-3xl pointer-events-none"
              style={{ background: "radial-gradient(closest-side, oklch(0.7 0.18 250 / 0.6), transparent)" }}
            />

            <div className="relative">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-primary">
                    <BrainCircuit className="size-4" /> Live AI Risk Assessment Demo
                  </div>
                  <h2 className="mt-1 text-2xl md:text-3xl font-bold tracking-tight">Interactive AI Early Warning Output</h2>
                </div>

                {/* Risk Selector Tabs */}
                <div className="flex rounded-full bg-secondary/80 p-1 border border-border">
                  <button
                    onClick={() => setActiveRiskTab("high")}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                      activeRiskTab === "high" ? "bg-destructive text-destructive-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    High Risk Flag
                  </button>
                  <button
                    onClick={() => setActiveRiskTab("medium")}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                      activeRiskTab === "medium" ? "bg-warning text-warning-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Medium Risk
                  </button>
                  <button
                    onClick={() => setActiveRiskTab("low")}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                      activeRiskTab === "low" ? "bg-success text-success-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Low Risk (Stable)
                  </button>
                </div>
              </div>

              {/* Dynamic Risk Sample Display */}
              <div className="mt-8 grid gap-6 md:grid-cols-3">
                {activeRiskTab === "high" && (
                  <>
                    <DemoCard title="Risk Classification" value="HIGH RISK" color="text-destructive bg-destructive/10 border-destructive/30" icon={<ShieldAlert className="size-5" />} description="CGPA < 2.50 or declining trend with failed courses." />
                    <DemoCard title="Predicted Next GPA" value="1.95 GPA" color="text-primary bg-primary/10 border-primary/20" icon={<TrendingUp className="size-5" />} description="Forecast based on previous semester GPA slope." />
                    <DemoCard title="Automated Action" value="Auto-Referral Triggered" color="text-warning bg-warning/10 border-warning/30" icon={<UserCheck className="size-5" />} description="Automatic referral assigned to Academic Counselor." />
                  </>
                )}
                {activeRiskTab === "medium" && (
                  <>
                    <DemoCard title="Risk Classification" value="MEDIUM RISK" color="text-warning bg-warning/10 border-warning/30" icon={<BrainCircuit className="size-5" />} description="CGPA 2.50 - 3.49 or negative GPA trend slope." />
                    <DemoCard title="Predicted Next GPA" value="2.85 GPA" color="text-primary bg-primary/10 border-primary/20" icon={<TrendingUp className="size-5" />} description="Moderate improvement with tutorial attendance." />
                    <DemoCard title="Recommended Action" value="Academic Advisory" color="text-foreground bg-accent border-border" icon={<CheckCircle2 className="size-5" />} description="Attend peer tutorials and advisory sessions." />
                  </>
                )}
                {activeRiskTab === "low" && (
                  <>
                    <DemoCard title="Risk Classification" value="LOW RISK" color="text-success bg-success/10 border-success/30" icon={<Award className="size-5" />} description="CGPA >= 3.50 with stable or improving trend." />
                    <DemoCard title="Predicted Next GPA" value="4.65 GPA" color="text-primary bg-primary/10 border-primary/20" icon={<TrendingUp className="size-5" />} description="On track for First Class Honors." />
                    <DemoCard title="Recommended Action" value="Mentorship & Research" color="text-success bg-success/10 border-success/30" icon={<Sparkles className="size-5" />} description="Maintain study habits and pursue honors projects." />
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* CORE FEATURE PILLARS */}
        <section id="ai-features" className="mt-24">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-primary">Key Capabilities</span>
            <h2 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight">Engineered for Academic Excellence</h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <FeatureCard
              icon="chart"
              title="Risk Prediction Model"
              subtitle="Decision Trees & Random Forest"
              body="Analyzes student CGPA, previous GPAs, failed courses, referrals, and credit units to classify risk with probability scores."
            />
            <FeatureCard
              icon="sparkle"
              title="CGPA Forecasting"
              subtitle="Linear Regression Analysis"
              body="Evaluates historical GPA trajectories to forecast expected next semester GPA and end-of-program CGPA."
            />
            <FeatureCard
              icon="shield"
              title="Automated Interventions"
              subtitle="Counselor Database Trigger"
              body="High Risk predictions trigger PostgreSQL database triggers that auto-create counselor intervention tickets with 7-day deadlines."
            />
          </div>
        </section>

        {/* PORTAL LAUNCHERS */}
        <section className="mt-24 grid gap-6 md:grid-cols-2">
          <PortalLauncher
            title="Student Portal"
            subtitle="View Live CGPA, AI Risk Cards & Counselor Referrals"
            description="Track your academic performance, view predicted GPAs, and access personalized advisory recommendations."
            cta="Sign In to Student Portal"
            to="/auth"
            icon="cap"
          />
          <PortalLauncher
            title="Counselor & Admin Portal"
            subtitle="Batch Predictions, Risk Distribution & Intervention"
            description="Monitor high-risk students across departments, launch AI batch assessments, and manage counselor interventions."
            cta="Open Admin & Counselor Center"
            to="/auth"
            icon="shield"
          />
        </section>
      </main>

      <footer className="border-t border-border/60 py-10 text-center text-xs text-muted-foreground bg-card">
        <div className="mx-auto max-w-6xl px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="GradeLens Logo" className="size-6 object-contain rounded-md" />
            <span className="font-semibold text-foreground">GradeLens AI Academic Warning System</span>
          </div>
          <div>© {new Date().getFullYear()} GradeLens. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}

function StatBox({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="card-elevated rounded-2xl p-5 border border-border/80 bg-card text-center">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl md:text-3xl font-bold tracking-tight text-gradient">{value}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function DemoCard({ title, value, color, icon, description }: { title: string; value: string; color: string; icon: React.ReactNode; description: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/80 p-5 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className={`mt-2 inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-sm font-bold border ${color}`}>
        {icon}
        {value}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

function FeatureCard({ icon, title, subtitle, body }: { icon: "chart" | "sparkle" | "shield"; title: string; subtitle: string; body: string }) {
  return (
    <div className="card-elevated rounded-3xl p-6 md:p-8 border border-border/80 bg-card transition hover:-translate-y-1">
      <Icon3d name={icon} size={56} />
      <h3 className="mt-5 text-xl font-bold">{title}</h3>
      <div className="text-xs font-semibold text-primary mt-0.5">{subtitle}</div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function PortalLauncher({ title, subtitle, description, cta, to, icon }: { title: string; subtitle: string; description: string; cta: string; to: string; icon: "cap" | "shield" }) {
  return (
    <Link to={to} className="card-elevated group relative overflow-hidden rounded-[32px] p-8 md:p-10 border border-primary/20 bg-card transition hover:-translate-y-1">
      <div
        aria-hidden
        className="absolute -right-20 -bottom-20 size-72 rounded-full opacity-40 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(closest-side, oklch(0.7 0.18 250 / 0.5), transparent)" }}
      />
      <div className="relative">
        <Icon3d name={icon} size={64} />
        <h3 className="mt-5 text-2xl font-bold tracking-tight">{title}</h3>
        <div className="text-xs font-semibold text-primary mt-1">{subtitle}</div>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{description}</p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-md transition group-hover:opacity-90">
          {cta} <ArrowRight className="size-4 transition group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );
}
