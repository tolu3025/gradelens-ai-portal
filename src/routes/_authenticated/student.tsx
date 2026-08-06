import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/use-current-user";
import { AppNav } from "@/components/AppNav";
import { Loader2 } from "lucide-react";

import { AIInsightPanel } from "@/components/ai/AIInsightPanel";

export const Route = createFileRoute("/_authenticated/student")({
  component: StudentPage,
});

function StudentPage() {
  const { data: me } = useCurrentUser();
  const matric = me?.matricNo;

  const cgpaQ = useQuery({
    queryKey: ["cgpa", matric],
    enabled: !!matric,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cgpa_summary")
        .select("*")
        .eq("matric_no", matric!)
        .order("level", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const gradesQ = useQuery({
    queryKey: ["grades", matric],
    enabled: !!matric,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grades")
        .select("*")
        .eq("matric_no", matric!)
        .order("level", { ascending: true })
        .order("semester", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const referralsQ = useQuery({
    queryKey: ["my-referrals", matric],
    enabled: !!matric,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("counselor_referrals")
        .select("*, counselors(full_name, email)")
        .eq("matric_no", matric!)
        .order("referred_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Calculate semester GPAs for AI Early Warning System
  const semesterStats = (() => {
    const map = new Map<string, { label: string; cu: number; wp: number }>();
    let failedCount = 0;
    for (const g of gradesQ.data ?? []) {
      const key = `L${g.level}·S${g.semester}`;
      const cur = map.get(key) ?? { label: key, cu: 0, wp: 0 };
      cur.cu += g.credit_units;
      cur.wp += g.weighted_point;
      map.set(key, cur);
      if (g.grade === "F" || g.score < 40) failedCount++;
    }
    const list = [...map.values()].map((s) => ({
      label: s.label,
      gpa: s.cu ? s.wp / s.cu : 0,
    }));
    return { list, failedCount };
  })();

  return (
    <div className="min-h-screen">
      <AppNav role="student" name={me?.fullName ?? undefined} />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-8 md:pt-12">
        {!matric ? (
          <EmptyState title="No student record linked" desc="Your account isn't connected to a matric number yet." />
        ) : (
          <>
            <CgpaCard
              loading={cgpaQ.isLoading}
              data={cgpaQ.data}
              name={me?.fullName ?? cgpaQ.data?.student_name ?? "Student"}
              matric={matric}
            />

            {/* AI Academic Early Warning & Predictive Intelligence Panel */}
            <section className="mt-10">
              <AIInsightPanel
                matricNo={matric}
                currentCgpa={cgpaQ.data ? Number(cgpaQ.data.cgpa) : 0}
                pastGpas={semesterStats.list.map((s) => s.gpa)}
                failedCoursesCount={semesterStats.failedCount}
                totalCreditUnits={cgpaQ.data?.total_credit_units ?? 0}
                pastSemesters={semesterStats.list}
              />
            </section>

            <section className="mt-10">
              <SectionHeader title="Referrals" subtitle="Conversations your counselor has opened with you." />
              {referralsQ.isLoading ? (
                <LoadingBlock />
              ) : (referralsQ.data?.length ?? 0) === 0 ? (
                <EmptyInline text="No referrals — keep up the good work." />
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {referralsQ.data!.map((r) => (
                    <div key={r.id} className="card-elevated rounded-2xl p-5">
                      <div className="flex items-center justify-between">
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusTone(r.status)}`}>{r.status}</span>
                        <span className="text-[11px] text-muted-foreground">CGPA at referral: {Number(r.cgpa_at_referral).toFixed(2)}</span>
                      </div>
                      <div className="mt-3 text-sm font-medium">{r.referral_reason}</div>
                      <div className="mt-1 text-[13px] text-muted-foreground">
                        {(r.counselors as any)?.full_name ?? "Unassigned counselor"}
                        {(r.counselors as any)?.email && ` · ${(r.counselors as any).email}`}
                      </div>
                      {r.meeting_deadline && (
                        <div className="mt-3 text-[12px] text-muted-foreground">
                          Meet by {new Date(r.meeting_deadline).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="mt-12">
              <SectionHeader title="Grades" subtitle="All courses recorded across levels and semesters." />
              {gradesQ.isLoading ? (
                <LoadingBlock />
              ) : (gradesQ.data?.length ?? 0) === 0 ? (
                <EmptyInline text="No grades on file." />
              ) : (
                <GradesGrouped grades={gradesQ.data!} />
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function GradesGrouped({ grades }: { grades: any[] }) {
  const groups = new Map<string, any[]>();
  for (const g of grades) {
    const key = `Level ${g.level} · Semester ${g.semester}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(g);
  }
  return (
    <div className="space-y-6">
      {[...groups.entries()].map(([key, rows]) => {
        const cu = rows.reduce((a, r) => a + r.credit_units, 0);
        const wp = rows.reduce((a, r) => a + r.weighted_point, 0);
        const gpa = cu ? (wp / cu).toFixed(2) : "—";
        return (
          <div key={key} className="card-elevated overflow-hidden rounded-3xl">
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
              <h3 className="text-sm font-semibold tracking-tight">{key}</h3>
              <div className="flex items-center gap-3 text-[12px] text-muted-foreground">
                <span>{cu} CU</span>
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-primary">GPA {gpa}</span>
              </div>
            </div>
            <div className="overflow-x-auto border-t border-border">
              <table className="w-full text-sm">
                <thead className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-6 py-3 font-medium">Course</th>
                    <th className="px-3 py-3 font-medium">Title</th>
                    <th className="px-3 py-3 text-right font-medium">CU</th>
                    <th className="px-3 py-3 text-right font-medium">Score</th>
                    <th className="px-3 py-3 text-right font-medium">Grade</th>
                    <th className="px-6 py-3 text-right font-medium">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-border/60">
                      <td className="px-6 py-3 font-medium">{r.course_code}</td>
                      <td className="px-3 py-3 text-muted-foreground">{r.course_title}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{r.credit_units}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{r.score}</td>
                      <td className="px-3 py-3 text-right">
                        <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${gradeTone(r.grade)}`}>{r.grade}</span>
                      </td>
                      <td className="px-6 py-3 text-right tabular-nums">{r.weighted_point}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CgpaCard({ loading, data, name, matric }: { loading: boolean; data: any; name: string; matric: string }) {
  return (
    <div className="card-elevated relative overflow-hidden rounded-[28px] p-8 md:p-10">
      <div
        aria-hidden
        className="absolute -right-24 -top-24 size-72 rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(closest-side, oklch(0.7 0.18 250 / 0.55), transparent)" }}
      />
      <div className="relative">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Academic record</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">{name}</h1>
        <div className="mt-1 text-sm text-muted-foreground">{matric}</div>

        {loading ? (
          <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading record…
          </div>
        ) : !data ? (
          <div className="mt-6 text-sm text-muted-foreground">No CGPA record yet.</div>
        ) : (
          <div className="mt-6 grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Current CGPA</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-7xl font-bold tracking-tight text-gradient">{Number(data.cgpa).toFixed(2)}</span>
                <span className="text-sm text-muted-foreground">/ 5.00</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-[12px] font-medium">
                <span className={`rounded-full px-3 py-1 ${classTone(data.classification)}`}>{data.classification}</span>
                <span className={`rounded-full px-3 py-1 ${statusTone(data.status)}`}>{data.status}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Credit units" value={String(data.total_credit_units)} />
              <Stat label="Weighted pts" value={String(data.total_weighted_points)} />
              <Stat label="Level" value={String(data.level)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/60 px-4 py-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4 flex items-end justify-between">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function LoadingBlock() {
  return (
    <div className="card-elevated flex items-center gap-2 rounded-2xl p-6 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" /> Loading…
    </div>
  );
}

function EmptyInline({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">{text}</div>;
}

function EmptyState({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="card-elevated rounded-3xl p-10 text-center">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function classTone(c: string) {
  if (c === "First Class") return "bg-success/15 text-success";
  if (c?.startsWith("Second Class Upper")) return "bg-primary/15 text-primary";
  if (c?.startsWith("Second Class Lower")) return "bg-warning/15 text-warning";
  return "bg-destructive/15 text-destructive";
}
function statusTone(s: string) {
  if (s === "ABOVE AVERAGE" || s === "COMPLETED") return "bg-success/15 text-success";
  if (s === "AVERAGE" || s === "PENDING") return "bg-warning/15 text-warning";
  return "bg-destructive/15 text-destructive";
}
function gradeTone(g: string) {
  if (g === "A") return "bg-success/15 text-success";
  if (g === "B") return "bg-primary/15 text-primary";
  if (g === "C") return "bg-warning/15 text-warning";
  if (g === "D" || g === "E") return "bg-warning/15 text-warning";
  return "bg-destructive/15 text-destructive";
}
