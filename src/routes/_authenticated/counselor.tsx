import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/use-current-user";
import { AppNav } from "@/components/AppNav";
import { Loader2, CheckCircle2, XCircle, InboxIcon } from "lucide-react";
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
      const selectQuery = "*, students(student_name, department, programme, level)";
      const { data: refs, error } = await supabase
        .from("counselor_referrals")
        .select(selectQuery)
        .eq("counselor_id", counselorQ.data!.id)
        .order("referred_at", { ascending: false });

      if (error) throw error;
      if (!refs || refs.length === 0) return [];

      const enriched = await Promise.all(
        refs.map(async (r: any) => {
          const { data: pred } = await supabase
            .from("predictions")
            .select("risk_level, risk_probability, recommendations")
            .eq("matric_no", r.matric_no)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          return { ...r, prediction: pred };
        })
      );
      return enriched;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: "COMPLETED" | "MISSED" }) => {
      const { error } = await supabase.from("counselor_referrals").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Referral status updated");
      qc.invalidateQueries({ queryKey: ["counselor-refs"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update"),
  });

  return (
    <div className="min-h-screen">
      <AppNav role="counselor" name={me?.fullName ?? undefined} />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-8 md:pt-12">
        <div className="card-elevated rounded-[28px] p-8 md:p-10">
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Counselor Portal</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">
            {counselorQ.data?.full_name ?? me?.fullName ?? "Counselor Dashboard"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {counselorQ.data?.email ?? me?.email ?? "Academic Guidance & Intervention"}
          </p>
        </div>

        <section className="mt-10">
          <div className="mb-4">
            <h2 className="text-xl font-semibold tracking-tight">Assigned Referrals &amp; AI Diagnostics</h2>
            <p className="text-sm text-muted-foreground">Students flagged by the AI Early Warning System requiring counselor intervention.</p>
          </div>

          {/* Not linked to a counselor profile */}
          {!counselorQ.isLoading && !counselorQ.data ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-12 text-center">
              <InboxIcon className="size-10 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">Your account is not yet linked to a counselor profile.</p>
              <p className="text-xs text-muted-foreground/70">Ask the administrator to set up your counselor record in the system.</p>
            </div>
          ) : refQ.isLoading || counselorQ.isLoading ? (
            <Loading />
          ) : (refQ.data?.length ?? 0) === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-12 text-center">
              <InboxIcon className="size-10 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">No referrals assigned yet.</p>
              <p className="text-xs text-muted-foreground/70">Referrals will appear here when the AI system flags at-risk students or faculty make manual referrals.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {refQ.data!.map((r: any) => {
                const pred = r.prediction;
                const riskLevel = pred?.risk_level ?? (r.cgpa_at_referral < 2.5 ? "High Risk" : "Medium Risk");

                return (
                  <div key={r.id} className="card-elevated rounded-2xl p-5 border border-border/80 bg-card">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tone(r.status)}`}>
                          {r.status}
                        </span>
                        <span className="rounded-full bg-destructive/15 text-destructive border border-destructive/30 px-2.5 py-0.5 text-[11px] font-semibold">
                          AI: {riskLevel}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground">{new Date(r.referred_at).toLocaleDateString()}</span>
                    </div>

                    <div className="mt-3 text-base font-semibold">{r.students?.student_name ?? r.matric_no}</div>
                    <div className="text-[12px] text-muted-foreground">
                      Matric: <span className="font-mono text-foreground font-medium">{r.matric_no}</span>
                      {r.students?.department && ` · ${r.students.department}`}
                      {r.students?.level && ` · L${r.students.level}`}
                    </div>

                    <div className="mt-3 text-sm">
                      <span className="text-muted-foreground">Reason: </span>
                      <span className="font-medium">{r.referral_reason}</span>
                    </div>
                    <div className="mt-1 text-[13px] text-muted-foreground">
                      CGPA at referral: <span className="font-semibold text-foreground">{Number(r.cgpa_at_referral).toFixed(2)}</span>
                      {r.meeting_deadline && ` · Meet by ${new Date(r.meeting_deadline).toLocaleDateString()}`}
                    </div>

                    {pred?.risk_probability && (
                      <div className="mt-3 rounded-xl bg-primary/10 border border-primary/20 p-2.5 text-[12px]">
                        <span className="font-semibold text-foreground">AI Risk Probability: </span>
                        <span className="font-bold text-primary">{(Number(pred.risk_probability) * 100).toFixed(1)}%</span>
                      </div>
                    )}

                    {r.status === "PENDING" && (
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => updateStatus.mutate({ id: r.id, status: "COMPLETED" })}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-success/15 px-3 py-2 text-[13px] font-medium text-success hover:bg-success/25 transition"
                        >
                          <CheckCircle2 className="size-4" /> Mark Completed
                        </button>
                        <button
                          onClick={() => updateStatus.mutate({ id: r.id, status: "MISSED" })}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-destructive/15 px-3 py-2 text-[13px] font-medium text-destructive hover:bg-destructive/25 transition"
                        >
                          <XCircle className="size-4" /> Mark Missed
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
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
      <Loader2 className="size-4 animate-spin" /> Loading referrals…
    </div>
  );
}

function tone(s: string) {
  if (s === "COMPLETED") return "bg-success/15 text-success";
  if (s === "PENDING") return "bg-warning/15 text-warning";
  return "bg-destructive/15 text-destructive";
}
