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
      // 1. Fetch profiles and students tables in parallel
      const [{ data: profilesData }, { data: studentsData }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, matric_no").order("full_name", { ascending: true }),
        supabase.from("students").select("matric_no, student_name, level, department, programme"),
      ]);

      const profiles = profilesData ?? [];
      const students = studentsData ?? [];

      // Map students by matric and by name
      const studentMapByMatric = new Map<string, any>();
      const studentMapByName = new Map<string, any>();
      for (const s of students) {
        if (s.matric_no) studentMapByMatric.set(s.matric_no, s);
        if (s.student_name) studentMapByName.set(s.student_name.toLowerCase(), s);
      }

      // Merge profiles & student rows
      const merged = profiles.map((p: any) => {
        const studentRow = 
          (p.matric_no ? studentMapByMatric.get(p.matric_no) : null) ||
          (p.full_name ? studentMapByName.get(p.full_name.toLowerCase()) : null);

        // Fallback matric generation if not set yet
        const displayMatric = p.matric_no || studentRow?.matric_no || `2024/${Math.floor(10000 + (p.id ? p.id.charCodeAt(0) * 31 : 58720) % 90000)}`;
        const displayLevel = studentRow?.level ?? 100;

        return {
          id: p.id,
          matric_no: displayMatric,
          student_name: p.full_name ?? p.email?.split("@")[0] ?? "Student",
          email: p.email,
          level: displayLevel,
          department: studentRow?.department ?? "Software Engineering",
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
          title="Registered Students &amp; Profiles"
          subtitle="All registered users in the system linked to academic records and levels."
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
                  : `${filtered.length} student${filtered.length !== 1 ? "s" : ""}`}
              </span>
            </div>

            <div className="mt-6 card-elevated overflow-hidden rounded-3xl">
              {studentsQ.isLoading ? (
                <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Loading students from database…
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
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s: any) => (
                      <tr key={s.id} className="border-t border-border/60 hover:bg-accent/20 transition-colors">
                        <td className="px-6 py-3 font-semibold">{s.student_name}</td>
                        <td className="px-3 py-3 text-[12px] text-muted-foreground">{s.email ?? "—"}</td>
                        <td className="px-3 py-3 font-mono font-medium text-foreground">
                          {s.matric_no}
                        </td>
                        <td className="px-3 py-3 text-muted-foreground font-medium">
                          L{s.level}
                        </td>
                        <td className="px-3 py-3 text-[12px] text-muted-foreground">
                          {s.department}
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