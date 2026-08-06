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
      // Primary source: profiles table (all registered users)
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email, matric_no")
        .order("full_name", { ascending: true });

      if (profilesError) throw profilesError;
      const profiles = profilesData ?? [];

      // Secondary source: students table (has level, department, CGPA)
      const { data: studentsData } = await supabase
        .from("students")
        .select("matric_no, student_name, level, department, programme");

      const studentMap = new Map<string, any>();
      for (const s of studentsData ?? []) {
        studentMap.set(s.matric_no, s);
      }

      // Merge: every profile is a user; enrich with student record if matric matches
      const merged = profiles.map((p: any) => {
        const studentRow = p.matric_no ? studentMap.get(p.matric_no) : null;
        return {
          id: p.id,
          matric_no: p.matric_no ?? "—",
          student_name: p.full_name ?? p.email?.split("@")[0] ?? "Unknown",
          email: p.email,
          level: studentRow?.level ?? null,
          department: studentRow?.department ?? null,
          cgpa_summary: null,  // will fetch below if needed
          predictions: null,
        };
      });

      return merged;
    },
  });

  const filtered = useMemo(() => {
    const list = studentsQ.data ?? [];
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter(
      (x: any) =>
        x.student_name?.toLowerCase().includes(s) ||
        x.matric_no?.toLowerCase().includes(s) ||
        x.email?.toLowerCase().includes(s),
    );
  }, [studentsQ.data, q]);

  return (
    <div className="min-h-screen">
      <AppNav role="admin" name={me?.fullName ?? undefined} />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-8 md:pt-12">
        <PageHeader
          eyebrow="Admin"
          title="Registered Users"
          subtitle="All registered users in the system. Students appear here as soon as they sign up."
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
                placeholder="Search by name, email or matric number…"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <span className="text-[12px] text-muted-foreground">
                {studentsQ.isLoading
                  ? "Loading…"
                  : `${filtered.length} user${filtered.length !== 1 ? "s" : ""}`}
              </span>
            </div>

            <div className="mt-6 card-elevated overflow-hidden rounded-3xl">
              {studentsQ.isLoading ? (
                <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Loading users from database…
                </div>
              ) : studentsQ.error ? (
                <div className="p-8 text-sm text-destructive">
                  Failed to load users. Please refresh and try again.
                </div>
              ) : (studentsQ.data ?? []).length === 0 ? (
                <div className="flex flex-col items-center gap-3 p-12 text-center">
                  <UserX className="size-10 text-muted-foreground/40" />
                  <p className="text-sm font-medium text-muted-foreground">No users registered yet.</p>
                  <p className="text-xs text-muted-foreground/70">
                    Users will appear here as soon as they sign up at the portal.
                  </p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No users match &ldquo;{q}&rdquo;.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-left text-[11px] uppercase tracking-wider text-muted-foreground bg-accent/30">
                    <tr>
                      <th className="px-6 py-3 font-medium">Full Name</th>
                      <th className="px-3 py-3 font-medium">Email</th>
                      <th className="px-3 py-3 font-medium">Matric No.</th>
                      <th className="px-3 py-3 font-medium">Level</th>
                      <th className="px-3 py-3 font-medium">Department</th>
                      <th className="px-3 py-3 font-medium">CGPA</th>
                      <th className="px-6 py-3 font-medium">AI Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s: any) => (
                      <tr key={s.id} className="border-t border-border/60 hover:bg-accent/20 transition-colors">
                        <td className="px-6 py-3 font-semibold">{s.student_name}</td>
                        <td className="px-3 py-3 text-[12px] text-muted-foreground">{s.email ?? "—"}</td>
                        <td className="px-3 py-3 font-mono text-muted-foreground">
                          {s.matric_no !== "—" ? s.matric_no : <span className="text-muted-foreground/40 italic">Not set</span>}
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">
                          {s.level ? `L${s.level}` : <span className="text-muted-foreground/40 italic">—</span>}
                        </td>
                        <td className="px-3 py-3 text-[12px] text-muted-foreground">
                          {s.department ?? <span className="text-muted-foreground/40 italic">—</span>}
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">—</td>
                        <td className="px-6 py-3">
                          <span className="text-[11px] text-muted-foreground/50 italic">Run AI batch</span>
                        </td>
                      </tr>
                    ))}
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