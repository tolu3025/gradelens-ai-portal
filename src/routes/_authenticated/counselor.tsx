import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/use-current-user";
import { AppNav } from "@/components/AppNav";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/counselor")({
  component: CounselorPage,
});

function CounselorPage() {
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();

  const counselorQ = useQuery({
    queryKey: ["counselor-self", me?.userId],
    enabled: !!me?.userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("counselors")
        .select("*")
        .eq("user_id", me!.userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const refQ = useQuery({
    queryKey: ["counselor-refs", counselorQ.data?.id],
    enabled: !!counselorQ.data?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("counselor_referrals")
        .select("*, students(student_name, department, programme, level, predictions(risk_level, risk_probability, decision_reason))")
        .eq("counselor_id", counselorQ.data!.id)
        .order("referred_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: "COMPLETED" | "MISSED" }) => {
      const { error } = await supabase.from("counselor_referrals").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["counselor-refs"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="min-h-screen">
      <AppNav role="counselor" name={me?.fullName ?? undefined} />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-8 md:pt-12">
        <div className="card-elevated rounded-[28px] p-8 md:p-10">
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Counselor Dashboard</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">
            {counselorQ.data?.full_name ?? me?.fullName ?? "Counselor"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {counselorQ.data?.email ?? me?.email}
          </p>
        </div>

        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Assigned referrals & AI Diagnostics</h2>
              <p className="text-sm text-muted-foreground">Students flagged by AI Early Warning or faculty for counselor intervention.</p>
            </div>
          </div>

          {!counselorQ.data ? (
            <Empty text="Your account isn't linked to a counselor profile yet." />
          ) : refQ.isLoading ? (
            <Loading />
          ) : (refQ.data?.length ?? 0) === 0 ? (
            <Empty text="No referrals assigned." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {refQ.data!.map((r: any) => {
                const preds = r.students?.predictions;
                const predObj = Array.isArray(preds) ? preds[0] : preds;
                const riskLevel = predObj?.risk_level || (r.cgpa_at_referral < 2.5 ? "High Risk" : "Medium Risk");

                return (
                  <div key={r.id} className="card-elevated rounded-2xl p-5 border border-border/80">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tone(r.status)}`}>{r.status}</span>
                        <span className="rounded-full bg-destructive/15 text-destructive border border-destructive/30 px-2.5 py-0.5 text-[11px] font-semibold">
                          AI: {riskLevel}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground">{new Date(r.referred_at).toLocaleDateString()}</span>
                    </div>
                    <div className="mt-3 text-base font-semibold">{r.students?.student_name ?? r.matric_no}</div>
                    <div className="text-[12px] text-muted-foreground">
                      {r.matric_no} · {r.students?.department} · L{r.students?.level}
                    </div>
                    <div className="mt-3 text-sm">
                      Reason: <span className="font-medium">{r.referral_reason}</span>
                    </div>
                    <div className="text-[13px] text-muted-foreground">
                      CGPA at referral: {Number(r.cgpa_at_referral).toFixed(2)}
                      {r.meeting_deadline && ` · meet by ${new Date(r.meeting_deadline).toLocaleDateString()}`}
                    </div>

                    {predObj?.decision_reason && (
                      <div className="mt-3 rounded-xl bg-accent/40 p-2.5 text-[11px] text-muted-foreground">
                        <span className="font-semibold text-foreground">AI Rationale: </span>
                        {predObj.decision_reason}
                      </div>
                    )}

                  {r.status === "PENDING" && (
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => updateStatus.mutate({ id: r.id, status: "COMPLETED" })}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-success/15 px-3 py-2 text-[13px] font-medium text-success hover:bg-success/25"
                      >
                        <CheckCircle2 className="size-4" /> Mark completed
                      </button>
                      <button
                        onClick={() => updateStatus.mutate({ id: r.id, status: "MISSED" })}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-destructive/15 px-3 py-2 text-[13px] font-medium text-destructive hover:bg-destructive/25"
                      >
                        <XCircle className="size-4" /> Missed
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Loading() {
  return (
    <div className="card-elevated flex items-center gap-2 rounded-2xl p-6 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" /> Loading…
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">{text}</div>;
}
function tone(s: string) {
  if (s === "COMPLETED") return "bg-success/15 text-success";
  if (s === "PENDING") return "bg-warning/15 text-warning";
  return "bg-destructive/15 text-destructive";
}
