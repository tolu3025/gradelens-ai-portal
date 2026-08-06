import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/use-current-user";
import { AppNav, PageHeader } from "@/components/AppNav";
import { Icon3d } from "@/components/Icon3d";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Upload, Sparkles, FileSpreadsheet, CheckCircle2, XCircle, Clock, FileCheck } from "lucide-react";
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

      return (roles ?? []).map((r) => ({
        id: r.id,
        role: r.role,
        profile: profileMap.get(r.user_id),
      }));
    },
  });

  const pendingSubmissionsQ = useQuery({
    queryKey: ["admin-pending-submissions"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("result_submissions")
        .select("*")
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const recordGrade = useMutation({
    mutationFn: async () => {
      const mat = matricNo.trim().toUpperCase();
      const code = courseCode.trim().toUpperCase();
      const title = courseTitle.trim() || code;
      const numScore = Number(score) || 0;
      const numCu = Number(creditUnits) || 3;
      const numLvl = Number(level) || 100;
      const numSem = Number(semester) || 1;

      if (!mat || !code) throw new Error("Enter matric number and course code");

      const gradeInfo = computeGrade(numScore);
      const wp = gradeInfo.point * numCu;

      // 1. Insert grade into grades table
      const { error: gErr } = await supabase.from("grades").upsert({
        matric_no: mat,
        course_code: code,
        course_title: title,
        score: numScore,
        grade: gradeInfo.grade,
        credit_units: numCu,
        weighted_point: wp,
        level: numLvl,
        semester: numSem,
        status: "APPROVED"
      });
      if (gErr) throw gErr;

      // 2. Fetch all grades for this student and compute CGPA
      const { data: allGrades, error: fetchErr } = await supabase
        .from("grades")
        .select("credit_units, weighted_point")
        .eq("matric_no", mat);
      if (fetchErr) throw fetchErr;

      const totalCU = (allGrades ?? []).reduce((sum, g) => sum + Number(g.credit_units || 0), 0);
      const totalWP = (allGrades ?? []).reduce((sum, g) => sum + Number(g.weighted_point || 0), 0);
      const newCgpa = totalCU > 0 ? Number((totalWP / totalCU).toFixed(2)) : 0;
      const { classification, status } = getCgpaClassification(newCgpa);

      // 3. Upsert cumulative CGPA summary
      const { data: student } = await supabase
        .from("students")
        .select("student_name")
        .eq("matric_no", mat)
        .maybeSingle();

      await supabase.from("cgpa_summary").upsert({
        matric_no: mat,
        level: numLvl,
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

  const approveSubmissionMutation = useMutation({
    mutationFn: async (sub: any) => {
      const courses = Array.isArray(sub.courses_json) ? sub.courses_json : [];
      if (courses.length === 0) throw new Error("Submission has no course entries");

      // 1. Insert/Upsert into grades table
      for (const c of courses) {
        const scoreVal = Number(c.score) || 0;
        const cuVal = Number(c.cu) || 3;
        const gInfo = computeGrade(scoreVal);
        const wp = gInfo.point * cuVal;

        await supabase.from("grades").upsert({
          matric_no: sub.matric_no,
          course_code: c.code.trim().toUpperCase(),
          course_title: c.title.trim() || c.code,
          score: scoreVal,
          grade: gInfo.grade,
          credit_units: cuVal,
          weighted_point: wp,
          level: Number(sub.level),
          semester: Number(sub.semester),
          status: "APPROVED"
        });
      }

      // 2. Compute cumulative CGPA
      const { data: allGrades } = await supabase
        .from("grades")
        .select("credit_units, weighted_point")
        .eq("matric_no", sub.matric_no);

      const totalCU = (allGrades ?? []).reduce((sum: number, g: any) => sum + Number(g.credit_units || 0), 0);
      const totalWP = (allGrades ?? []).reduce((sum: number, g: any) => sum + Number(g.weighted_point || 0), 0);
      const newCgpa = totalCU > 0 ? Number((totalWP / totalCU).toFixed(2)) : 0;
      const { classification, status } = getCgpaClassification(newCgpa);

      await supabase.from("cgpa_summary").upsert({
        matric_no: sub.matric_no,
        level: Number(sub.level),
        total_credit_units: totalCU,
        total_weighted_points: totalWP,
        cgpa: newCgpa,
        classification,
        status,
        student_name: sub.student_name || `Student (${sub.matric_no})`,
        last_updated: new Date().toISOString()
      });

      // 3. Trigger AI Predictions
      await runAndSaveStudentPrediction(sub.matric_no);

      // 4. Mark submission as APPROVED
      const { error: subErr } = await supabase
        .from("result_submissions")
        .update({ status: "APPROVED", reviewed_at: new Date().toISOString() })
        .eq("id", sub.id);

      if (subErr) throw subErr;
      return { matric: sub.matric_no, newCgpa };
    },
    onSuccess: (res) => {
      toast.success(`Approved result for ${res.matric}! CGPA updated: ${res.newCgpa.toFixed(2)}`);
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e.message || "Failed to approve submission"),
  });

  const rejectSubmissionMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes?: string }) => {
      const { error } = await supabase
        .from("result_submissions")
        .update({ status: "REJECTED", admin_notes: notes || "Rejected by admin", reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Submission rejected");
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e.message || "Failed to reject submission"),
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

      // 1. Insert/Upsert into user_roles (gracefully handle RLS policy restrictions)
      const { error } = await supabase
        .from("user_roles")
        .upsert({ user_id: prof.id, role }, { onConflict: "user_id, role" })
        .select();

      if (error && error.message.includes("row-level security")) {
        console.warn("user_roles RLS notice:", error.message);
      } else if (error && !error.message.includes("duplicate") && !error.message.includes("unique")) {
        console.warn("user_roles notice:", error.message);
      }

      // 2. If role is counselor, also upsert into counselors table
      if (role === "counselor") {
        const { error: cErr } = await supabase.from("counselors").upsert({
          user_id: prof.id,
          full_name: prof.full_name || target.split("@")[0],
          email: target
        });
        if (cErr) console.warn("counselors table notice:", cErr.message);
      }
    },
    onSuccess: () => {
      toast.success(`Granted ${role} role successfully!`);
      setEmail("");
      qc.invalidateQueries({ queryKey: ["admin-roles"] });
      qc.invalidateQueries({ queryKey: ["current-user"] });
      qc.invalidateQueries();
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
          subtitle="Record grades, review student result submissions, and launch AI Risk Assessment."
          icon={<Icon3d name="gear" size={64} />}
        />

        {!isAdmin ? (
          <NotAllowed />
        ) : (
          <>
            {/* PENDING STUDENT RESULT APPROVALS QUEUE */}
            <section className="mt-8 card-elevated rounded-3xl p-6 md:p-8 border border-primary/30 bg-primary/5">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <FileCheck className="size-5 text-primary" />
                <span>Pending Student Result Approvals Queue</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Results uploaded by students from their portal requiring Admin Verification &amp; CGPA Computation.
              </p>

              <div className="mt-6">
                {pendingSubmissionsQ.isLoading ? (
                  <div className="flex items-center gap-2 p-6 text-xs text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" /> Loading pending submissions…
                  </div>
                ) : (pendingSubmissionsQ.data ?? []).filter((s: any) => s.status === "PENDING").length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/80 p-8 text-center text-xs text-muted-foreground">
                    No pending student result submissions awaiting approval.
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {(pendingSubmissionsQ.data ?? [])
                      .filter((s: any) => s.status === "PENDING")
                      .map((sub: any) => {
                        const courses = Array.isArray(sub.courses_json) ? sub.courses_json : [];
                        return (
                          <div key={sub.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="text-sm font-bold text-foreground">{sub.student_name || sub.matric_no}</h4>
                                <div className="text-xs font-mono text-muted-foreground">Matric: {sub.matric_no}</div>
                              </div>
                              <span className="rounded-full bg-warning/15 px-2.5 py-0.5 text-[11px] font-semibold text-warning">
                                Level {sub.level} · Sem {sub.semester}
                              </span>
                            </div>

                            <div className="mt-3 space-y-1 max-h-36 overflow-y-auto rounded-xl bg-accent/30 p-2.5 text-xs font-mono">
                              {courses.map((c: any, idx: number) => (
                                <div key={idx} className="flex justify-between border-b border-border/40 pb-1 last:border-0">
                                  <span>{c.code} ({c.cu} CU)</span>
                                  <span className="font-bold">{c.score} Marks</span>
                                </div>
                              ))}
                            </div>

                            <div className="mt-4 flex gap-2">
                              <button
                                onClick={() => approveSubmissionMutation.mutate(sub)}
                                disabled={approveSubmissionMutation.isPending}
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-success px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition disabled:opacity-60 shadow-sm"
                              >
                                {approveSubmissionMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                                Approve &amp; Compute CGPA
                              </button>

                              <button
                                onClick={() => rejectSubmissionMutation.mutate({ id: sub.id })}
                                disabled={rejectSubmissionMutation.isPending}
                                className="flex items-center justify-center gap-1 rounded-full bg-secondary px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition"
                              >
                                <XCircle className="size-3.5" /> Reject
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </section>

            {/* Grade Upload & AI Workflow Tool */}
            <section className="mt-8 card-elevated rounded-3xl p-6 md:p-8 border border-primary/20 bg-surface/80">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <FileSpreadsheet className="size-4" />
                <span>Manual Grade Entry &amp; Direct Admin Upload</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Grades Uploaded → Calculate CGPA → Predict Risk &amp; Next GPA → Generate Recommendations → Save Prediction → Auto-Refer High Risk
              </p>

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
                    placeholder="e.g. SEN 301"
                    className="mt-1 w-full rounded-2xl border border-border bg-surface/90 px-3.5 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/40 uppercase"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Course Title</label>
                  <input
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    placeholder="Software Engineering"
                    className="mt-1 w-full rounded-2xl border border-border bg-surface/90 px-3.5 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Score (0 - 100) *</label>
                  <input
                    type="number"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-border bg-surface/90 px-3.5 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Credit Units *</label>
                  <select
                    value={creditUnits}
                    onChange={(e) => setCreditUnits(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-border bg-surface/90 px-3.5 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                  >
                    <option value="1">1 Credit Unit</option>
                    <option value="2">2 Credit Units</option>
                    <option value="3">3 Credit Units</option>
                    <option value="4">4 Credit Units</option>
                    <option value="6">6 Credit Units</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Level *</label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-border bg-surface/90 px-3.5 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                  >
                    <option value="100">100 Level</option>
                    <option value="200">200 Level</option>
                    <option value="300">300 Level</option>
                    <option value="400">400 Level</option>
                    <option value="500">500 Level</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Semester *</label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-border bg-surface/90 px-3.5 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                  >
                    <option value="1">1st Semester</option>
                    <option value="2">2nd Semester</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => recordGrade.mutate()}
                    disabled={recordGrade.isPending}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition disabled:opacity-60 shadow-sm"
                  >
                    {recordGrade.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                    Save Grade &amp; Compute CGPA
                  </button>
                </div>
              </div>
            </section>

            {/* Role Grant Section */}
            <section className="mt-8 card-elevated rounded-3xl p-6 md:p-8">
              <h3 className="text-lg font-semibold tracking-tight">Assign user role</h3>
              <p className="mt-1 text-xs text-muted-foreground">Promote registered users to Counselor or Administrator permissions.</p>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="User email address…"
                  className="flex-1 rounded-2xl border border-border bg-surface/90 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 min-w-[240px]"
                />
                <select
                  value={role}
                  onChange={(e: any) => setRole(e.target.value)}
                  className="rounded-2xl border border-border bg-surface/90 px-4 py-2.5 text-sm outline-none font-medium"
                >
                  <option value="student">student</option>
                  <option value="counselor">counselor</option>
                  <option value="admin">admin</option>
                </select>
                <button
                  onClick={() => grant.mutate()}
                  disabled={grant.isPending}
                  className="flex items-center justify-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60 shadow-sm"
                >
                  {grant.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Grant Role
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

function computeGrade(score: number) {
  if (score >= 70) return { grade: "A", point: 5 };
  if (score >= 60) return { grade: "B", point: 4 };
  if (score >= 50) return { grade: "C", point: 3 };
  if (score >= 45) return { grade: "D", point: 2 };
  if (score >= 40) return { grade: "E", point: 1 };
  return { grade: "F", point: 0 };
}

function getCgpaClassification(cgpa: number) {
  if (cgpa >= 4.5) return { classification: "First Class", status: "GOOD_STANDING" };
  if (cgpa >= 3.5) return { classification: "Second Class Upper", status: "GOOD_STANDING" };
  if (cgpa >= 2.4) return { classification: "Second Class Lower", status: "GOOD_STANDING" };
  if (cgpa >= 1.5) return { classification: "Third Class", status: "ACADEMIC_WARNING" };
  return { classification: "Pass / Probation", status: "PROBATION" };
}

function NotAllowed() {
  return (
    <div className="mt-8 card-elevated rounded-3xl p-10 text-center">
      <h2 className="text-xl font-semibold">Admin access required</h2>
      <p className="mt-2 text-sm text-muted-foreground">Your account doesn't have the admin role.</p>
    </div>
  );
}