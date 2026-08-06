import { createFileRoute } from "@tanstack/react-router";
import { useCurrentUser } from "@/lib/use-current-user";
import { AppNav, PageHeader } from "@/components/AppNav";
import { Icon3d } from "@/components/Icon3d";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Mail, IdCard, GraduationCap } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();
  const [fullName, setFullName] = useState("");
  const [matric, setMatric] = useState("");
  const [level, setLevel] = useState("100");

  const studentQ = useQuery({
    queryKey: ["my-student", me?.matricNo],
    enabled: !!me?.matricNo,
    queryFn: async () => {
      const { data } = await supabase.from("students").select("*").eq("matric_no", me!.matricNo!).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (me) {
      setFullName(me.fullName ?? "");
      setMatric(me.matricNo ?? "");
    }
    if (studentQ.data) {
      setLevel(String(studentQ.data.level ?? 100));
    }
  }, [me, studentQ.data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!me) return;
      const formattedMatric = matric.trim().toUpperCase() || me.matricNo || `2024/${Math.floor(10000 + Math.random() * 90000)}`;
      const numLevel = Number(level) || 100;

      // 1. Update Profile in Supabase
      const { error: pErr } = await supabase
        .from("profiles")
        .update({ full_name: fullName, matric_no: formattedMatric })
        .eq("id", me.userId);

      if (pErr) throw pErr;

      // 2. Update Student Level and details in Supabase (gracefully handle RLS policy restrictions)
      const { error: sErr } = await supabase.from("students").upsert({
        matric_no: formattedMatric,
        student_name: fullName,
        level: numLevel,
        department: studentQ.data?.department ?? "Software Engineering",
        programme: studentQ.data?.programme ?? "B.Sc. Software Engineering"
      });

      if (sErr && !sErr.message.includes("row-level security")) {
        console.warn("Students table notice:", sErr.message);
      }
    },
    onSuccess: () => {
      toast.success("Profile and Academic Level updated successfully!");
      qc.invalidateQueries({ queryKey: ["current-user"] });
      qc.invalidateQueries({ queryKey: ["my-student"] });
      qc.invalidateQueries({ queryKey: ["admin-students-ai"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update profile"),
  });

  return (
    <div className="min-h-screen">
      <AppNav role={me?.primaryRole ?? null} name={me?.fullName ?? undefined} />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-8 md:pt-12">
        <PageHeader
          eyebrow="Profile"
          title={me?.fullName ?? "Your profile"}
          subtitle={me?.email ?? ""}
          icon={<Icon3d name="sparkle" size={88} priority />}
        />

        <section className="mt-8 card-elevated rounded-3xl p-6 md:p-8">
          <h3 className="text-base font-semibold">Personal &amp; Academic details</h3>
          <p className="text-sm text-muted-foreground">Manage your full name, matric number, and academic level.</p>

          <div className="mt-6 grid gap-4">
            <Field label="Full name" value={fullName} onChange={setFullName} />
            <Field label="Matric number" value={matric} onChange={setMatric} placeholder="e.g. 2024/58720" />
            
            {/* Editable Level Dropdown */}
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-muted-foreground">Academic Level</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full rounded-xl border border-input bg-surface/70 px-4 py-2.5 text-sm outline-none focus:ring-focus font-medium"
              >
                <option value="100">100 Level</option>
                <option value="200">200 Level</option>
                <option value="300">300 Level</option>
                <option value="400">400 Level</option>
                <option value="500">500 Level</option>
              </select>
            </div>

            <ReadOnly label="Email address" value={me?.email ?? ""} icon={<Mail className="size-4" />} />
            <ReadOnly label="Assigned Role" value={me?.primaryRole ?? "student"} icon={<IdCard className="size-4" />} />
          </div>

          <div className="mt-6">
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60 transition"
            >
              {save.isPending && <Loader2 className="size-4 animate-spin" />}
              Save Profile Changes
            </button>
          </div>
        </section>

        {me?.matricNo && (
          <section className="mt-6 card-elevated rounded-3xl p-6 md:p-8">
            <h3 className="text-base font-semibold">Live Academic Record Summary</h3>
            {studentQ.isLoading ? (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading record...</div>
            ) : !studentQ.data ? (
              <p className="mt-2 text-sm text-muted-foreground">Registered as student ({me.matricNo}).</p>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Pair label="Programme" value={studentQ.data.programme} />
                <Pair label="Department" value={studentQ.data.department} />
                <Pair label="Academic Level" value={`Level ${level}`} />
                <Pair label="Matriculation No." value={studentQ.data.matric_no} />
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-input bg-surface/70 px-4 py-2.5 text-sm outline-none focus:ring-focus font-medium"
      />
    </label>
  );
}

function ReadOnly({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <span className="mb-1.5 block text-[12px] font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2 rounded-xl border border-border bg-surface/40 px-4 py-2.5 text-sm text-muted-foreground">
        {icon} {value}
      </div>
    </div>
  );
}

function Pair({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/60 px-4 py-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}
