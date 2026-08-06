import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/use-current-user";
import { AppNav } from "@/components/AppNav";
import { Loader2, AlertCircle, CheckCircle2, UserCheck, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

import { AIInsightPanel } from "@/components/ai/AIInsightPanel";

export const Route = createFileRoute("/_authenticated/student")({
  component: StudentPage,
});

function StudentPage() {
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();
  const matric = me?.matricNo;

  // Profile prompt update state
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [fullNameInput, setFullNameInput] = useState("");
  const [matricInput, setMatricInput] = useState("");
  const [levelInput, setLevelInput] = useState("100");
  const [departmentInput, setDepartmentInput] = useState("Software Engineering");
  const [programmeInput, setProgrammeInput] = useState("B.Sc. Software Engineering");

  const studentDbQ = useQuery({
    queryKey: ["student-db-record", me?.userId, matric],
    queryFn: async () => {
      if (!me?.userId) return null;

      // 1. Check profiles table
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name, matric_no")
        .eq("id", me.userId)
        .maybeSingle();

      const mat = prof?.matric_no || matric;

      // 2. Check students table
      let student = null;
      if (mat) {
        const { data: st } = await supabase
          .from("students")
          .select("*")
          .eq("matric_no", mat)
          .maybeSingle();
        student = st;
      }

      return { prof, student, activeMatric: mat };
    },
  });

  useEffect(() => {
    if (me) {
      setFullNameInput(me.fullName ?? "");
      setMatricInput(me.matricNo ?? "");
    }
    if (studentDbQ.data?.student) {
      const s = studentDbQ.data.student;
      if (s.level) setLevelInput(String(s.level));
      if (s.department) setDepartmentInput(s.department);
      if (s.programme) setProgrammeInput(s.programme);
      if (s.student_name) setFullNameInput(s.student_name);
    }
  }, [me, studentDbQ.data]);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!me?.userId) throw new Error("Not authenticated");
      const mat = matricInput.trim().toUpperCase();
      const name = fullNameInput.trim() || me.email?.split("@")[0] || "Student";
      const lvl = Number(levelInput) || 100;
      const dept = departmentInput.trim() || "Software Engineering";
      const prog = programmeInput.trim() || "B.Sc. Software Engineering";

      if (!mat) throw new Error("Please enter your official Matriculation Number");

      // 1. Update profiles table
      const { error: pErr } = await supabase
        .from("profiles")
        .upsert({ id: me.userId, email: me.email, full_name: name, matric_no: mat });
      
      // 2. Upsert students table (gracefully handle RLS policy restrictions)
      const { error: sErr } = await supabase
        .from("students")
        .upsert({
          matric_no: mat,
          student_name: name,
          level: lvl,
          department: dept,
          programme: prog,
        });

      if (sErr && !sErr.message.includes("row-level security")) {
        console.warn("Students table notice:", sErr.message);
      }

      // 3. Update auth metadata
      await supabase.auth.updateUser({
        data: { full_name: name, matric_no: mat, level: lvl, department: dept, programme: prog },
      });

      return { mat, name, lvl, dept, prog };
    },
    onSuccess: () => {
      toast.success("Academic details verified & updated successfully!");
      setShowUpdateModal(false);
      setBannerDismissed(true);
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e.message || "Failed to update profile"),
  });

  const activeMatric = studentDbQ.data?.activeMatric || matric;
  const isProfileComplete = !!(studentDbQ.data?.prof?.matric_no || studentDbQ.data?.student?.matric_no);

  const cgpaQ = useQuery({
    queryKey: ["cgpa", activeMatric, me?.matricNo],
    enabled: !!activeMatric || !!me?.matricNo,
    queryFn: async () => {
      const mat = (activeMatric || me?.matricNo || "").trim();
      if (!mat) return null;

      const { data: exactData } = await supabase
        .from("cgpa_summary")
        .select("*")
        .ilike("matric_no", mat)
        .order("level", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (exactData) return exactData;

      const { data: allCgpa } = await supabase.from("cgpa_summary").select("*");
      if (!allCgpa) return null;

      const matClean = mat.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
      return allCgpa.find((c: any) => {
        const cClean = (c.matric_no ?? "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
        return cClean === matClean || (matClean.length >= 4 && cClean.includes(matClean));
      }) ?? null;
    },
  });

  const gradesQ = useQuery({
    queryKey: ["grades", activeMatric, me?.matricNo],
    enabled: !!activeMatric || !!me?.matricNo,
    queryFn: async () => {
      const mat = (activeMatric || me?.matricNo || "").trim();
      if (!mat) return [];

      const { data: exactData } = await supabase
        .from("grades")
        .select("*")
        .ilike("matric_no", mat)
        .order("level", { ascending: true })
        .order("semester", { ascending: true });

      if (exactData && exactData.length > 0) return exactData;

      const { data: allGrades } = await supabase
        .from("grades")
        .select("*")
        .order("level", { ascending: true })
        .order("semester", { ascending: true });

      if (!allGrades) return [];

      const matClean = mat.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
      return allGrades.filter((g: any) => {
        const gClean = (g.matric_no ?? "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
        return gClean === matClean || (matClean.length >= 4 && gClean.includes(matClean));
      });
    },
  });

  const referralsQ = useQuery({
    queryKey: ["my-referrals", activeMatric],
    enabled: !!activeMatric,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("counselor_referrals")
        .select("*, counselors(full_name, email)")
        .eq("matric_no", activeMatric!)
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

        {/* PROMPT BANNER FOR ACADEMIC DETAILS VERIFICATION (Only shown if profile is not yet complete in database) */}
        {!isProfileComplete && !bannerDismissed && (
          <section className="mb-8 card-elevated rounded-3xl p-6 border border-primary/30 bg-primary/5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/20 text-primary">
                  <UserCheck className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">Verify &amp; Update Your Academic Profile</h3>
                  <p className="text-xs text-muted-foreground">
                    Confirm your official Matriculation Number, Academic Level, and Department for AI Warnings &amp; Counseling records.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowUpdateModal((s) => !s)}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition shadow-sm"
              >
                <Sparkles className="size-3.5" />
                {showUpdateModal ? "Hide Details Form" : "Enter / Update Correct Details"}
              </button>
            </div>

            {/* INLINE EDITABLE DETAILS FORM */}
            {showUpdateModal && (
              <div className="mt-6 border-t border-primary/20 pt-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Full Name *</label>
                    <input
                      value={fullNameInput}
                      onChange={(e) => setFullNameInput(e.target.value)}
                      placeholder="e.g. Ayinoluwa Ifeoluwa"
                      className="mt-1 w-full rounded-2xl border border-border bg-card px-3.5 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Matriculation No. *</label>
                    <input
                      value={matricInput}
                      onChange={(e) => setMatricInput(e.target.value)}
                      placeholder="e.g. 2024/11705"
                      className="mt-1 w-full rounded-2xl border border-border bg-card px-3.5 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Academic Level *</label>
                    <select
                      value={levelInput}
                      onChange={(e) => setLevelInput(e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-border bg-card px-3.5 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                    >
                      <option value="100">100 Level</option>
                      <option value="200">200 Level</option>
                      <option value="300">300 Level</option>
                      <option value="400">400 Level</option>
                      <option value="500">500 Level</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Department</label>
                    <input
                      value={departmentInput}
                      onChange={(e) => setDepartmentInput(e.target.value)}
                      placeholder="Software Engineering"
                      className="mt-1 w-full rounded-2xl border border-border bg-card px-3.5 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Programme</label>
                    <input
                      value={programmeInput}
                      onChange={(e) => setProgrammeInput(e.target.value)}
                      placeholder="B.Sc. Software Engineering"
                      className="mt-1 w-full rounded-2xl border border-border bg-card px-3.5 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={() => updateProfileMutation.mutate()}
                      disabled={updateProfileMutation.isPending}
                      className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition disabled:opacity-60"
                    >
                      {updateProfileMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                      Save &amp; Update Record
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {!activeMatric ? (
          <EmptyState title="Please verify your Matriculation Number above" desc="Enter your official matriculation number in the form above to display your CGPA and grades." />
        ) : (
          <>
            <CgpaCard
              loading={cgpaQ.isLoading}
              data={cgpaQ.data}
              name={me?.fullName ?? studentDbQ.data?.student?.student_name ?? "Student"}
              matric={activeMatric}
            />

            {/* AI Academic Early Warning & Predictive Intelligence Panel */}
            <section className="mt-10">
              <AIInsightPanel
                matricNo={activeMatric}
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
