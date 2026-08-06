import { createFileRoute } from "@tanstack/react-router";
import { useCurrentUser } from "@/lib/use-current-user";
import { AppNav, PageHeader } from "@/components/AppNav";
import { Icon3d } from "@/components/Icon3d";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Mail, IdCard } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();
  const [fullName, setFullName] = useState("");
  const [matric, setMatric] = useState("");

  useEffect(() => {
    if (me) {
      setFullName(me.fullName ?? "");
      setMatric(me.matricNo ?? "");
    }
  }, [me]);

  const studentQ = useQuery({
    queryKey: ["my-student", me?.matricNo],
    enabled: !!me?.matricNo,
    queryFn: async () => {
      const { data } = await supabase.from("students").select("*").eq("matric_no", me!.matricNo!).maybeSingle();
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!me) return;
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName, matric_no: matric.trim().toUpperCase() || null })
        .eq("id", me.userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["current-user"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
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
          <h3 className="text-base font-semibold">Personal details</h3>
          <p className="text-sm text-muted-foreground">Your name and matric link your account to your academic record.</p>

          <div className="mt-6 grid gap-4">
            <Field label="Full name" value={fullName} onChange={setFullName} />
            <Field label="Matric number" value={matric} onChange={setMatric} placeholder="e.g. CSC/2020/001" />
            <ReadOnly label="Email" value={me?.email ?? ""} icon={<Mail className="size-4" />} />
            <ReadOnly label="Role" value={me?.primaryRole ?? "—"} icon={<IdCard className="size-4" />} />
          </div>

          <div className="mt-6">
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {save.isPending && <Loader2 className="size-4 animate-spin" />}
              Save changes
            </button>
          </div>
        </section>

        {me?.matricNo && (
          <section className="mt-6 card-elevated rounded-3xl p-6 md:p-8">
            <h3 className="text-base font-semibold">Student record</h3>
            {studentQ.isLoading ? (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading…</div>
            ) : !studentQ.data ? (
              <p className="mt-2 text-sm text-muted-foreground">No matching student row.</p>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Pair label="Programme" value={studentQ.data.programme} />
                <Pair label="Department" value={studentQ.data.department} />
                <Pair label="Current level" value={String(studentQ.data.level)} />
                <Pair label="Matric no." value={studentQ.data.matric_no} />
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
        className="w-full rounded-xl border border-input bg-surface/70 px-4 py-2.5 text-sm outline-none focus:ring-focus"
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
      <div className="mt-0.5 text-sm font-medium">{value}</div>
    </div>
  );
}
