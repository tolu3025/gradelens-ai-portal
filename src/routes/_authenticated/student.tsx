import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/use-current-user";
import { AppNav } from "@/components/AppNav";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  UserCheck,
  Sparkles,
  Upload,
  Plus,
  Trash2,
  Clock,
  FileSpreadsheet,
  XCircle,
} from "lucide-react";
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

  // Result Upload Modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [subLevel, setSubLevel] = useState("100");
  const [subSemester, setSubSemester] = useState("1");
  const [coursesList, setCoursesList] = useState<Array<{ code: string; title: string; cu: number; score: number }>>([
    { code: "CSC 101", title: "Introduction to Computer Science", cu: 3, score: 75 },
    { code: "MTH 101", title: "General Mathematics I", cu: 3, score: 68 },
  ]);

  const studentDbQ = useQuery({
    queryKey: ["student-db-record", me?.userId, matric],
    queryFn: async () => {
      if (!me?.userId) return null;

      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name, matric_no")
        .eq("id", me.userId)
        .maybeSingle();

      const mat = prof?.matric_no || matric;

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
    }
  }, [me, studentDbQ.data]);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!me?.userId) throw new Error("Not logged in");
      const mat = matricInput.trim().toUpperCase();
      const name = fullNameInput.trim() || me.fullName || "Student";
      const lvl = Number(levelInput) || 100;
      const dept = departmentInput.trim() || "Software Engineering";
      const prog = programmeInput.trim() || "B.Sc. Software Engineering";

      if (!mat) throw new Error("Please enter your official Matriculation Number");

      const { error: pErr } = await supabase
        .from("profiles")
        .upsert({ id: me.userId, email: me.email, full_name: name, matric_no: mat });

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

  const submissionsQ = useQuery({
    queryKey: ["my-submissions", activeMatric],
    enabled: !!activeMatric,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("result_submissions")
        .select("*")
        .ilike("matric_no", activeMatric!)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
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

  const submitResultMutation = useMutation({
    mutationFn: async () => {
      if (!activeMatric) throw new Error("Please verify your Matriculation Number first");
      if (coursesList.length === 0) throw new Error("Add at least one course entry");

      for (const c of coursesList) {
        if (!c.code.trim()) throw new Error("Enter course code for all entries");
      }

      const { error } = await supabase.from("result_submissions").insert({
        student_id: me?.userId,
        matric_no: activeMatric,
        student_name: me?.fullName || me?.email?.split("@")[0] || "Student",
        level: Number(subLevel),
        semester: Number(subSemester),
        courses_json: coursesList,
        status: "PENDING",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Semester Result submitted! Pending Admin Approval.");
      setShowUploadModal(false);
      qc.invalidateQueries({ queryKey: ["my-submissions"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to submit result"),
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

  const addCourseRow = () => {
    setCoursesList((prev) => [...prev, { code: "", title: "", cu: 3, score: 70 }]);
  };

  const removeCourseRow = (index: number) => {
    setCoursesList((prev) => prev.filter((_, i) => i !== index));
  };

  const updateCourseRow = (index: number, field: string, value: any) => {
    setCoursesList((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  };

  return (
    <div className="min-h-screen">
      <AppNav role="student" name={me?.fullName ?? undefined} />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-8 md:pt-12">

        {/* PROMPT BANNER FOR ACADEMIC DETAILS VERIFICATION */}
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
                    Confirm your official Matriculation Number, Academic Level, and Department.
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
            {/* TOP HEADER ACTION BAR */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Academic Overview</h2>
                <p className="text-xs text-muted-foreground">Track your CGPA, submit printed portal results for admin approval, and review AI insights.</p>
              </div>

              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition shadow-md"
              >
                <Upload className="size-4" /> Upload Semester Result (Pending Admin Approval)
              </button>
            </div>

            <CgpaCard
              loading={cgpaQ.isLoading}
              data={cgpaQ.data}
              name={me?.fullName ?? studentDbQ.data?.student?.student_name ?? "Student"}
              matric={activeMatric}
            />

            {/* PENDING RESULT SUBMISSIONS SECTION */}
            {(submissionsQ.data?.length ?? 0) > 0 && (
              <section className="mt-8">
                <SectionHeader title="Your Semester Result Submissions" subtitle="Results submitted from your portal awaiting Admin Approval & CGPA computation." />
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {submissionsQ.data!.map((sub: any) => {
                    const courses = Array.isArray(sub.courses_json) ? sub.courses_json : [];
                    return (
                      <div key={sub.id} className="card-elevated rounded-3xl p-5 border border-border/80 bg-card">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">Level {sub.level} · Semester {sub.semester}</span>
                            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${subStatusTone(sub.status)}`}>
                              {sub.status === "PENDING" ? "Pending Admin Review ⏳" : sub.status}
                            </span>
                          </div>
                          <span className="text-[11px] text-muted-foreground">{new Date(sub.submitted_at).toLocaleDateString()}</span>
                        </div>

                        <div className="mt-3 text-xs text-muted-foreground">
                          Courses Submitted: <strong className="text-foreground">{courses.length} courses</strong>
                        </div>

                        <div className="mt-2 space-y-1 max-h-32 overflow-y-auto rounded-xl bg-accent/30 p-2.5 text-xs font-mono">
                          {courses.map((c: any, idx: number) => (
                            <div key={idx} className="flex justify-between border-b border-border/40 pb-1 last:border-0">
                              <span>{c.code} ({c.cu} CU)</span>
                              <span className="font-bold">{c.score} Marks</span>
                            </div>
                          ))}
                        </div>

                        {sub.admin_notes && (
                          <div className="mt-3 rounded-xl bg-secondary/60 p-2.5 text-xs italic text-muted-foreground">
                            Admin Note: &ldquo;{sub.admin_notes}&rdquo;
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

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

            {/* APPROVED GRADES SECTION */}
            <section className="mt-10">
              <SectionHeader title="Official Approved Grades" subtitle="Verified grades recorded by Administration." />
              {gradesQ.isLoading ? (
                <LoadingBlock />
              ) : (gradesQ.data?.length ?? 0) === 0 ? (
                <EmptyInline text="No official approved grades on file yet. Upload your printed portal results above for admin review." />
              ) : (
                <GroupedGrades grades={gradesQ.data!} />
              )}
            </section>

            <section className="mt-10">
              <SectionHeader title="Referrals" subtitle="Conversations your counselor has opened with you." />
              {referralsQ.isLoading ? (
                <LoadingBlock />
              ) : (referralsQ.data?.length ?? 0) === 0 ? (
                <EmptyInline text="No referrals — keep up the good work." />
              ) : (
                <div className="grid gap-3">
                  {referralsQ.data!.map((r: any) => (
                    <div key={r.id} className="card-elevated flex flex-col gap-2 rounded-2xl p-5 border border-border">
                      <div className="flex items-center justify-between">
                        <span className="rounded-full bg-warning/15 px-2.5 py-0.5 text-[11px] font-semibold text-warning">{r.status}</span>
                        <span className="text-[11px] text-muted-foreground">{new Date(r.referred_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm font-medium">{r.referral_reason}</p>
                      <p className="text-xs text-muted-foreground">Counselor: {r.counselors?.full_name ?? "Assigned Staff"}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {/* RESULT UPLOAD MODAL */}
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fade-in_0.2s_ease-out]">
            <div className="card-elevated w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 md:p-8 bg-card border border-border">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <h3 className="text-lg font-bold">Submit Semester Result</h3>
                  <p className="text-xs text-muted-foreground">Enter course scores printed from your school portal for Admin Approval.</p>
                </div>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="rounded-full bg-secondary p-1.5 text-muted-foreground hover:text-foreground"
                >
                  <XCircle className="size-5" />
                </button>
              </div>

              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Academic Level *</label>
                    <select
                      value={subLevel}
                      onChange={(e) => setSubLevel(e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-border bg-surface/80 px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/40 font-medium"
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
                      value={subSemester}
                      onChange={(e) => setSubSemester(e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-border bg-surface/80 px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                    >
                      <option value="1">1st Semester</option>
                      <option value="2">2nd Semester</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Course Entries *</label>
                    <button
                      type="button"
                      onClick={addCourseRow}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      <Plus className="size-3.5" /> Add Course Row
                    </button>
                  </div>

                  <div className="space-y-3">
                    {coursesList.map((c, idx) => (
                      <div key={idx} className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/80 bg-accent/20 p-3">
                        <input
                          placeholder="Course Code (e.g. SEN 301)"
                          value={c.code}
                          onChange={(e) => updateCourseRow(idx, "code", e.target.value)}
                          className="flex-1 min-w-[120px] rounded-xl border border-border bg-card px-3 py-1.5 text-xs outline-none font-semibold uppercase"
                        />
                        <input
                          placeholder="Course Title (Optional)"
                          value={c.title}
                          onChange={(e) => updateCourseRow(idx, "title", e.target.value)}
                          className="flex-[2] min-w-[160px] rounded-xl border border-border bg-card px-3 py-1.5 text-xs outline-none font-medium"
                        />
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-muted-foreground">CU:</span>
                          <input
                            type="number"
                            min={1}
                            max={6}
                            value={c.cu}
                            onChange={(e) => updateCourseRow(idx, "cu", Number(e.target.value))}
                            className="w-14 rounded-xl border border-border bg-card px-2 py-1.5 text-xs text-center outline-none font-bold"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-muted-foreground">Score:</span>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={c.score}
                            onChange={(e) => updateCourseRow(idx, "score", Number(e.target.value))}
                            className="w-16 rounded-xl border border-border bg-card px-2 py-1.5 text-xs text-center outline-none font-bold"
                          />
                        </div>
                        {coursesList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeCourseRow(idx)}
                            className="text-destructive hover:opacity-80 p-1"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="rounded-full bg-secondary px-4 py-2 text-xs font-semibold hover:bg-accent"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => submitResultMutation.mutate()}
                    disabled={submitResultMutation.isPending}
                    className="flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60 shadow-sm"
                  >
                    {submitResultMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                    Submit for Admin Approval
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function GroupedGrades({ grades }: { grades: any[] }) {
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
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-primary font-semibold">GPA {gpa}</span>
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Cumulative Academic Index</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">{name}</h1>
          <p className="mt-1 text-sm font-mono text-muted-foreground">Matriculation No: {matric}</p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-5 animate-spin" /> Loading CGPA…
          </div>
        ) : data ? (
          <div className="text-right">
            <div className="text-4xl font-extrabold text-foreground tracking-tight md:text-5xl">
              {Number(data.cgpa).toFixed(2)}
            </div>
            <div className="mt-1 flex items-center justify-end gap-2 text-xs">
              <span className="rounded-full bg-primary/15 text-primary px-2.5 py-0.5 font-semibold">
                {data.classification}
              </span>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-secondary/60 px-4 py-3 text-xs text-muted-foreground">
            No CGPA computed yet. Submit your printed portal results above for admin approval.
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="card-elevated rounded-3xl p-10 text-center">
      <AlertCircle className="mx-auto size-10 text-muted-foreground/40" />
      <h3 className="mt-3 text-base font-semibold">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
    </div>
  );
}

function LoadingBlock() {
  return (
    <div className="card-elevated flex items-center gap-2 rounded-2xl p-6 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" /> Loading records…
    </div>
  );
}

function EmptyInline({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">{text}</div>;
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function gradeTone(g: string) {
  if (g === "A") return "bg-success/15 text-success";
  if (g === "B") return "bg-primary/15 text-primary";
  if (g === "C" || g === "D" || g === "E") return "bg-warning/15 text-warning";
  return "bg-destructive/15 text-destructive";
}

function subStatusTone(s: string) {
  if (s === "APPROVED") return "bg-success/15 text-success border border-success/30";
  if (s === "PENDING") return "bg-warning/15 text-warning border border-warning/30";
  return "bg-destructive/15 text-destructive border border-destructive/30";
}
