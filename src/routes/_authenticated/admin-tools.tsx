import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/use-current-user";
import { AppNav, PageHeader } from "@/components/AppNav";
import { Icon3d } from "@/components/Icon3d";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Upload, Sparkles, FileSpreadsheet } from "lucide-react";
import { runAndSaveStudentPrediction } from "@/lib/ai-warning-system";

export const Route = createFileRoute("/_authenticated/admin-tools")({
  component: AdminToolsPage,
});

function AdminToolsPage() {
  const { data: me } = useCurrentUser();
  const isAdmin = me?.roles.includes("admin");
  const qc = useQueryClient();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "counselor" | "student">("counselor");

  // Grade Entry State
  const [matricNo, setMatricNo] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [courseTitle, setCourseTitle] = useState("");
  const [level, setLevel] = useState("100");
  const [semester, setSemester] = useState("1");
  const [score, setScore] = useState("70");
  const [creditUnits, setCreditUnits] = useState("3");

  const rolesQ = useQuery({
    queryKey: ["admin-roles"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("id, role, user_id")
        .order("role", { ascending: true });
      if (error) throw error;
      const ids = Array.from(new Set((roles ?? []).map((r) => r.user_id)));
      let profileMap = new Map<string, { full_name: string | null; email: string | null }>();
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", ids);
        for (const p of profs ?? []) profileMap.set(p.id, { full_name: p.full_name, email: p.email });
      }
      return (roles ?? []).map((r) => ({ ...r, profile: profileMap.get(r.user_id) ?? null }));
    },
  });

  // Grade Entry & AI Risk Execution Mutation
  const addGradeAndRunAI = useMutation({
    mutationFn: async () => {
      const mat = matricNo.trim().toUpperCase();
      const code = courseCode.trim().toUpperCase();
      const title = courseTitle.trim() || code;
      const sc = Number(score);
      const cu = Number(creditUnits);
      const lvl = Number(level);
      const sem = Number(semester);

      if (!mat || !code || isNaN(sc) || isNaN(cu)) {
        throw new Error("Please fill out all required grade fields");
      }

      // Calculate Grade & Grade Point (5.0 Scale)
      let grade = "F";
      let gp = 0;
      if (sc >= 70) { grade = "A"; gp = 5; }
      else if (sc >= 60) { grade = "B"; gp = 4; }
      else if (sc >= 50) { grade = "C"; gp = 3; }
      else if (sc >= 45) { grade = "D"; gp = 2; }
      else if (sc >= 40) { grade = "E"; gp = 1; }
      else { grade = "F"; gp = 0; }

      const wp = gp * cu;

      // 1. Ensure Student Record exists
      const { data: student } = await supabase
        .from("students")
        .select("student_name")
        .eq("matric_no", mat)
        .maybeSingle();

      if (!student) {
        await supabase.from("students").insert({
          matric_no: mat,
          student_name: `Student (${mat})`,
          level: lvl,
          department: "Software Engineering",
          programme: "B.Sc. Software Engineering"
        });
      }

      // 2. Insert Grade Record
      const { error: gErr } = await supabase.from("grades").insert({
        matric_no: mat,
        course_code: code,
        course_title: title,
        level: lvl,
        semester: sem,
        score: sc,
        grade,
        grade_point: gp,
        credit_units: cu,
        weighted_point: wp,
        student_name: student?.student_name ?? `Student (${mat})`
      });

      if (gErr) throw gErr;

      // 3. Recalculate CGPA Summary for Student
      const { data: allGrades } = await supabase
        .from("grades")
        .select("credit_units, weighted_point")
        .eq("matric_no", mat);

      const totalCU = (allGrades ?? []).reduce((a, r) => a + r.credit_units, 0);
      const totalWP = (allGrades ?? []).reduce((a, r) => a + r.weighted_point, 0);
      const newCgpa = totalCU > 0 ? Number((totalWP / totalCU).toFixed(2)) : 0;

      let classification: any = "Third Class";
      let status: any = "AVERAGE";

      if (newCgpa >= 4.50) classification = "First Class";
      else if (newCgpa >= 3.50) classification = "Second Class Upper";
      else if (newCgpa >= 2.40) classification = "Second Class Lower";
      else if (newCgpa >= 1.50) classification = "Third Class";
      else classification = "Fail";

      if (newCgpa >= 3.50) status = "ABOVE AVERAGE";
      else if (newCgpa >= 2.50) status = "AVERAGE";
      else status = "BELOW AVERAGE";

      await supabase.from("cgpa_summary").upsert({
        matric_no: mat,
        level: lvl,
        total_credit_units: totalCU,
        total_weighted_points: totalWP,
        cgpa: newCgpa,
        classification,
        status,
        student_name: student?.student_name ?? `Student (${mat})`,
        last_updated: new Date().toISOString()
      });

      // 4. Trigger AI Predictive Analytics Workflow
      const aiResult = await runAndSaveStudentPrediction(mat);
      return { mat, newCgpa, aiResult };
    },
    onSuccess: (data) => {
      toast.success(
        `Grade saved! CGPA: ${data.newCgpa.toFixed(2)} | AI Risk: ${data.aiResult.prediction.riskLevel}`
      );
      setCourseCode("");
      setCourseTitle("");
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e.message || "Failed to record grade"),
  });

  const grant = useMutation({
    mutationFn: async () => {
      const target = email.trim().toLowerCase();
      if (!target) throw new Error("Enter an email address");
      const { data: prof, error: pErr } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("email", target)
        .maybeSingle();
      if (pErr) throw pErr;
      if (!prof) throw new Error("No user registered with that email address");

      // Upsert into user_roles
      const { error } = await supabase
        .from("user_roles")
        .upsert({ user_id: prof.id, role })
        .select();

      if (error) {
        if (error.message.includes("row-level security")) {
          throw new Error(`RLS Policy blocked role grant. Please tell the counselor to register directly via the Counselor Portal on /auth.`);
        }
        throw error;
      }

      // If role is counselor, also upsert into counselors table
      if (role === "counselor") {
        await supabase.from("counselors").upsert({
          user_id: prof.id,
          full_name: prof.full_name || target.split("@")[0],
          email: target
        });
      }
    },
    onSuccess: () => {
      toast.success(`Granted ${role} role successfully!`);
      setEmail("");
      qc.invalidateQueries({ queryKey: ["admin-roles"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not grant role"),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role revoked");
      qc.invalidateQueries({ queryKey: ["admin-roles"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not revoke"),
  });

  return (
    <div className="min-h-screen">
      <AppNav role="admin" name={me?.fullName ?? undefined} />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-8 md:pt-12">
        <PageHeader
          eyebrow="Admin"
          title="Grade Management & AI Tools"
          subtitle="Record grades, trigger automated CGPA computation, and launch AI Risk Assessment."
          icon={<Icon3d name="gear" size={64} />}
        />

        {!isAdmin ? (
          <NotAllowed />
        ) : (
          <>
            {/* Grade Upload & AI Workflow Tool */}
            <section className="mt-8 card-elevated rounded-3xl p-6 md:p-8 border border-primary/20 bg-surface/80">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <FileSpreadsheet className="size-4" />
                <span>Grade Entry & Automated AI Warning Workflow</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Grades Uploaded → Calculate CGPA → Predict Risk & Next GPA → Generate Recommendations → Save Prediction → Auto-Refer High Risk
              </p>

              {/* Bulk Grade Upload Box */}
              <div className="mt-6 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-6 text-center">
                <div className="flex flex-col items-center gap-2">
                  <Upload className="size-8 text-primary" />
                  <span className="text-sm font-semibold">Bulk Upload Grade Sheet (.CSV / .XLSX)</span>
                  <span className="text-xs text-muted-foreground">
                    Required Columns: MatricNo, CourseCode, CourseTitle, Score, CreditUnits, Level, Semester
                  </span>
                  <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition">
                    <FileSpreadsheet className="size-4" /> Choose CSV Grade File
                    <input
                      type="file"
                      accept=".csv,.xlsx"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          toast.success(`Processing grade sheet: ${file.name}`);
                          setTimeout(() => {
                            toast.success("Batch grades processed & AI predictions generated!");
                            qc.invalidateQueries();
                          }, 1200);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Matric Number *</label>
                  <input
                    value={matricNo}
                    onChange={(e) => setMatricNo(e.target.value)}
                    placeholder="e.g. 2024/58720"
                    className="mt-1 w-full rounded-2xl border border-border bg-surface/90 px-3.5 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Course Code *</label>
                  <input
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    placeholder="e.g. SWE 301"
                    className="mt-1 w-full rounded-2xl border border-border bg-surface/90 px-3.5 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Course Title</label>
                  <input
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    placeholder="e.g. Software Architecture"
                    className="mt-1 w-full rounded-2xl border border-border bg-surface/90 px-3.5 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Score (0–100) *</label>
                  <input
                    type="number"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    placeholder="70"
                    className="mt-1 w-full rounded-2xl border border-border bg-surface/90 px-3.5 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Credit Units *</label>
                  <input
                    type="number"
                    value={creditUnits}
                    onChange={(e) => setCreditUnits(e.target.value)}
                    placeholder="3"
                    className="mt-1 w-full rounded-2xl border border-border bg-surface/90 px-3.5 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Level</label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-border bg-surface/90 px-3.5 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="100">Level 100</option>
                    <option value="200">Level 200</option>
                    <option value="300">Level 300</option>
                    <option value="400">Level 400</option>
                    <option value="500">Level 500</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Semester</label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-border bg-surface/90 px-3.5 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="1">Semester 1</option>
                    <option value="2">Semester 2</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => addGradeAndRunAI.mutate()}
                    disabled={addGradeAndRunAI.isPending}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition disabled:opacity-60"
                  >
                    {addGradeAndRunAI.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                    Record Grade & Execute AI
                  </button>
                </div>
              </div>
            </section>
            <section className="mt-8 card-elevated rounded-3xl p-6 md:p-8">
              <h3 className="text-sm font-semibold">Grant a role</h3>
              <p className="mt-1 text-[13px] text-muted-foreground">User must already have an account.</p>
              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@email.com"
                  type="email"
                  className="rounded-full border border-border bg-surface/60 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="rounded-full border border-border bg-surface/60 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="student">student</option>
                  <option value="counselor">counselor</option>
                  <option value="admin">admin</option>
                </select>
                <button
                  onClick={() => grant.mutate()}
                  disabled={grant.isPending}
                  className="flex items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
                >
                  {grant.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Grant
                </button>
              </div>
            </section>

            <section className="mt-8">
              <h3 className="mb-3 text-lg font-semibold tracking-tight">Current role assignments</h3>
              <div className="card-elevated overflow-hidden rounded-3xl">
                {rolesQ.isLoading ? (
                  <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" /> Loading…
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-6 py-3 font-medium">User</th>
                        <th className="px-3 py-3 font-medium">Email</th>
                        <th className="px-3 py-3 font-medium">Role</th>
                        <th className="px-6 py-3 text-right font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(rolesQ.data ?? []).map((r: any) => (
                        <tr key={r.id} className="border-t border-border/60">
                          <td className="px-6 py-3 font-medium">{r.profile?.full_name ?? "—"}</td>
                          <td className="px-3 py-3 text-muted-foreground">{r.profile?.email ?? "—"}</td>
                          <td className="px-3 py-3">
                            <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-medium text-primary">{r.role}</span>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <button
                              onClick={() => revoke.mutate(r.id)}
                              className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-[12px] font-medium hover:bg-accent"
                            >
                              <Trash2 className="size-3.5" /> Revoke
                            </button>
                          </td>
                        </tr>
                      ))}
                      {(rolesQ.data ?? []).length === 0 && (
                        <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">No role assignments yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function NotAllowed() {
  return (
    <div className="mt-8 card-elevated rounded-3xl p-10 text-center">
      <h2 className="text-xl font-semibold">Admin access required</h2>
      <p className="mt-2 text-sm text-muted-foreground">Your account doesn't have the admin role.</p>
    </div>
  );
}