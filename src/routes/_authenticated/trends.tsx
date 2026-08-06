import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/use-current-user";
import { AppNav, PageHeader } from "@/components/AppNav";
import { Icon3d } from "@/components/Icon3d";
import { Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/trends")({
  component: TrendsPage,
});

function TrendsPage() {
  const { data: me } = useCurrentUser();
  const matric = me?.matricNo;

  const cgpaQ = useQuery({
    queryKey: ["cgpa-history", matric],
    enabled: !!matric,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cgpa_summary")
        .select("*")
        .eq("matric_no", matric!)
        .order("level", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const gradesQ = useQuery({
    queryKey: ["grades-trends", matric],
    enabled: !!matric,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grades")
        .select("level, semester, credit_units, weighted_point")
        .eq("matric_no", matric!);
      if (error) throw error;
      return data ?? [];
    },
  });

  const semesters = (() => {
    const map = new Map<string, { key: string; level: number; sem: number; cu: number; wp: number }>();
    for (const g of gradesQ.data ?? []) {
      const k = `${g.level}-${g.semester}`;
      const cur = map.get(k) ?? { key: k, level: g.level, sem: g.semester, cu: 0, wp: 0 };
      cur.cu += g.credit_units;
      cur.wp += g.weighted_point;
      map.set(k, cur);
    }
    return [...map.values()]
      .sort((a, b) => a.level - b.level || a.sem - b.sem)
      .map((s) => ({ ...s, gpa: s.cu ? s.wp / s.cu : 0 }));
  })();

  const maxGpa = 5;
  const last = semesters.at(-1)?.gpa ?? 0;
  const prev = semesters.at(-2)?.gpa ?? last;
  const delta = last - prev;

  return (
    <div className="min-h-screen">
      <AppNav role={me?.primaryRole ?? null} name={me?.fullName ?? undefined} />
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-8 md:pt-12">
        <PageHeader
          eyebrow="Trends"
          title="Your trajectory"
          subtitle="Semester-by-semester GPA, with a clean visual story of your growth."
          icon={<Icon3d name="chart" size={88} priority />}
        />

        {!matric ? (
          <Empty text="No student record linked." />
        ) : gradesQ.isLoading ? (
          <Loading />
        ) : semesters.length === 0 ? (
          <Empty text="No grades on file yet." />
        ) : (
          <>
            <section className="mt-8 grid gap-3 md:grid-cols-3">
              <StatCard label="Latest GPA" value={last.toFixed(2)} accent="primary" />
              <StatCard
                label="Change vs last"
                value={`${delta >= 0 ? "+" : ""}${delta.toFixed(2)}`}
                accent={delta > 0.01 ? "success" : delta < -0.01 ? "destructive" : "muted"}
                icon={delta > 0.01 ? <TrendingUp className="size-4" /> : delta < -0.01 ? <TrendingDown className="size-4" /> : <Minus className="size-4" />}
              />
              <StatCard label="Semesters tracked" value={String(semesters.length)} accent="brand2" />
            </section>

            <section className="mt-6 card-elevated rounded-3xl p-6 md:p-8">
              <h3 className="text-sm font-semibold">GPA over time</h3>
              <p className="text-xs text-muted-foreground">Out of {maxGpa.toFixed(2)}</p>
              <div className="mt-6">
                <LineChart points={semesters.map((s) => ({ label: `L${s.level}·S${s.sem}`, value: s.gpa }))} max={maxGpa} />
              </div>
            </section>

            <section className="mt-6 card-elevated rounded-3xl p-6 md:p-8">
              <h3 className="text-sm font-semibold">CGPA snapshots per level</h3>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {(cgpaQ.data ?? []).map((c) => (
                  <div key={c.level} className="rounded-2xl border border-border bg-surface/60 p-4">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Level {c.level}</div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-3xl font-semibold tabular-nums text-gradient">{Number(c.cgpa).toFixed(2)}</span>
                      <span className="text-xs text-muted-foreground">{c.classification}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function LineChart({ points, max }: { points: { label: string; value: number }[]; max: number }) {
  const w = 600, h = 200, pad = 28;
  const n = points.length;
  if (n === 0) return null;
  const x = (i: number) => pad + (i * (w - pad * 2)) / Math.max(1, n - 1);
  const y = (v: number) => h - pad - (v / max) * (h - pad * 2);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.value)}`).join(" ");
  const area = `${path} L ${x(n - 1)} ${h - pad} L ${x(0)} ${h - pad} Z`;
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-56 w-full min-w-[480px]">
        <defs>
          <linearGradient id="lg" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.7 0.18 250)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="oklch(0.7 0.18 250)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4, 5].map((g) => (
          <line key={g} x1={pad} x2={w - pad} y1={y(g)} y2={y(g)} stroke="currentColor" className="text-border" strokeWidth="1" strokeDasharray="2 4" />
        ))}
        <path d={area} fill="url(#lg)" />
        <path d={path} fill="none" stroke="oklch(0.7 0.18 250)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(p.value)} r="4" fill="oklch(0.99 0 0)" stroke="oklch(0.7 0.18 250)" strokeWidth="2" />
            <text x={x(i)} y={h - 6} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 10 }}>{p.label}</text>
            <text x={x(i)} y={y(p.value) - 10} textAnchor="middle" className="fill-foreground" style={{ fontSize: 10, fontWeight: 600 }}>{p.value.toFixed(2)}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function StatCard({ label, value, accent, icon }: {
  label: string; value: string; accent: "primary" | "success" | "destructive" | "muted" | "brand2"; icon?: React.ReactNode;
}) {
  const tone =
    accent === "success" ? "text-success" :
    accent === "destructive" ? "text-destructive" :
    accent === "muted" ? "text-muted-foreground" :
    accent === "brand2" ? "text-brand-2" : "text-primary";
  return (
    <div className="card-elevated rounded-2xl p-5">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 flex items-center gap-2 text-3xl font-semibold tabular-nums ${tone}`}>
        {icon}{value}
      </div>
    </div>
  );
}
function Loading() { return <div className="card-elevated mt-8 flex items-center gap-2 rounded-2xl p-6 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading…</div>; }
function Empty({ text }: { text: string }) { return <div className="mt-8 rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">{text}</div>; }
