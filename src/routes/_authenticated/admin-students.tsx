import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/use-current-user";
import { AppNav, PageHeader } from "@/components/AppNav";
import { Icon3d } from "@/components/Icon3d";
import { Loader2, Search, UserX } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin-students")({
  component: AdminStudentsPage,
});

function AdminStudentsPage() {
  const { data: me } = useCurrentUser();
  const isAdmin = me?.roles.includes("admin");
  const [q, setQ] = useState("");

  const studentsQ = useQuery({
    queryKey: ["admin-students-ai"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const selectCols = "matric_no, student_name, level, cgpa_summary(cgpa, classification, status), predictions(risk_level, predicted_gpa, trend_direction)";
      const { data, error } = await supabase
        .from("students")
        .select(selectCols)
        .order("student_name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const list = studentsQ.data ?? [];
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter(
      (x: any) =>
        x.student_name?.toLowerCase().includes(s) ||
        x.matric_no?.toLowerCase().includes(s),
    );
  }, [studentsQ.data, q]);

  return (
    <div className="min-h-screen">
      <AppNav role="admin" name={me?.fullName ?? undefined} />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-8 md:pt-12">
        <PageHeader
          eyebrow="Admin"
          title="Students & AI Diagnostics"
          subtitle="Every registered student with CGPA standings and AI Academic Warning predictions."
          icon={<Icon3d name="users" size={64} />}
        />

        {!isAdmin ? (
          <NotAllowed />
        ) : (
          <>
            <div className="mt-6 flex items-center gap-2 rounded-full glass px-4 py-2.5">
              <Search className="size-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by student name or matric number…"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <span className="text-[12px] text-muted-foreground">
                {studentsQ.isLoading ? "Loading…" : `${filtered.length} student${filtered.length !== 1 ? "s" : ""}`}
              </span>
            </div>

            <div className="mt-6 card-elevated overflow-hidden rounded-3xl">
              {studentsQ.isLoading ? (
                <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Loading students from database…
                </div>
              ) : studentsQ.error ? (
                <div className="p-8 text-sm text-destructive">
                  Failed to load students. Please refresh and try again.
                </div>
              ) : (studentsQ.data ?? []).length === 0 ? (
                <div className="flex flex-col items-center gap-3 p-12 text-center">
                  <UserX className="size-10 text-muted-foreground/40" />
                  <p className="text-sm font-medium text-muted-foreground">No students registered yet.</p>
                  <p className="text-xs text-muted-foreground/70">
                    Students will appear here once they sign up at the portal and provide their matric number.
                  </p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No students match &ldquo;{q}&rdquo;.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-left text-[11px] uppercase tracking-wider text-muted-foreground bg-accent/30">
                    <tr>
                      <th className="px-6 py-3 font-medium">Student Name</th>
                      <th className="px-3 py-3 font-medium">Matric No.</th>
                      <th className="px-3 py-3 font-medium">Level</th>
                      <th className="px-3 py-3 text-right font-medium">CGPA</th>
                      <th className="px-3 py-3 font-medium">Classification</th>
                      <th className="px-3 py-3 font-medium">AI Risk</th>
                      <th className="px-6 py-3 text-right font-medium">Pred. GPA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s: any) => {
                      const c = Array.isArray(s.cgpa_summary) ? s.cgpa_summary[0] : s.cgpa_summary;
                      const p = Array.isArray(s.predictions) ? s.predictions[0] : s.predictions;
                      const riskLevel = p?.risk_level || (c?.cgpa < 2.5 ? "High Risk" : c?.cgpa < 3.5 ? "Medium Risk" : "Low Risk");

                      return (
                        <tr key={s.matric_no} className="border-t border-border/60 hover:bg-accent/20 transition-colors">
                          <td className="px-6 py-3 font-semibold">{s.student_name ?? "—"}</td>
                          <td className="px-3 py-3 font-mono text-muted-foreground">{s.matric_no}</td>
                          <td className="px-3 py-3 text-muted-foreground">L{s.level ?? "—"}</td>
                          <td className="px-3 py-3 text-right tabular-nums font-bold">
                            {c?.cgpa ? Number(c.cgpa).toFixed(2) : "—"}
                          </td>
                          <td className="px-3 py-3 text-muted-foreground text-[12px]">{c?.classification ?? "—"}</td>
                          <td className="px-3 py-3">
                            {p?.risk_level ? (
                              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${riskTone(riskLevel)}`}>
                                {riskLevel}
                              </span>
                            ) : (
                              <span className="text-[11px] text-muted-foreground/50">No prediction</span>
                            )}
                          </td>
                          <td className="px-6 py-3 text-right tabular-nums font-bold text-primary">
                            {p?.predicted_gpa ? Number(p.predicted_gpa).toFixed(2) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
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

function riskTone(r: string) {
  const u = (r || "").toUpperCase();
  if (u.includes("HIGH")) return "bg-destructive/15 text-destructive border border-destructive/30";
  if (u.includes("MEDIUM")) return "bg-warning/15 text-warning border border-warning/30";
  return "bg-success/15 text-success border border-success/30";
}