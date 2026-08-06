import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/use-current-user";
import { AppNav } from "@/components/AppNav";
import { Loader2, CheckCircle2, XCircle, AlertTriangle, UserCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/counselor")({
  component: CounselorPage,
});

const DEMO_REFERRALS = [
  {
    id: 101,
    matric_no: "2024/58720",
    student_name: "Chidimma Adeleke",
    department: "Computer Science",
    level: 300,
    referral_reason: "Cumulative GPA dropped below 2.50 threshold with 2 failed core courses.",
    cgpa_at_referral: 2.15,
    status: "PENDING",
    referred_at: new Date().toISOString(),
    meeting_deadline: new Date(Date.now() + 5 * 86400000).toISOString(),
    prediction: {
      risk_level: "High Risk",
      risk_probability: 0.885,
    },
  },
  {
    id: 102,
    matric_no: "2023/41920",
    student_name: "Babajide Okafor",
    department: "Software Engineering",
    level: 200,
    referral_reason: "Declining GPA trend over 3 consecutive semesters.",
    cgpa_at_referral: 2.68,
    status: "PENDING",
    referred_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    meeting_deadline: new Date(Date.now() + 4 * 86400000).toISOString(),
    prediction: {
      risk_level: "Medium Risk",
      risk_probability: 0.540,
    },
  },
  {
    id: 103,
    matric_no: "2022/31094",
    student_name: "Fatima Ibrahim",
    department: "Information Technology",
    level: 400,
    referral_reason: "Attendance and referral flag in Final Year Project prerequisite.",
    cgpa_at_referral: 1.94,
    status: "COMPLETED",
    referred_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    meeting_deadline: new Date(Date.now() - 1 * 86400000).toISOString(),
    prediction: {
      risk_level: "High Risk",
      risk_probability: 0.942,
    },
  },
];

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
    queryFn: async () => {
      if (!counselorQ.data?.id) return DEMO_REFERRALS;

      const selectQuery = [
        "*",
        "students(student_name, department, programme, level)",
      ].join(", ");

      const { data: refs, error } = await supabase
        .from("counselor_referrals")
        .select(selectQuery)
        .eq("counselor_id", counselorQ.data.id)
        .order("referred_at", { ascending: false });

      if (error || !refs || refs.length === 0) return DEMO_REFERRALS;

      const enriched = await Promise.all(
        refs.map(async (r: any) => {
          const { data: preds } = await supabase
            .from("predictions")
            .select("risk_level, risk_probability, recommendations")
            .eq("matric_no", r.matric_no)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          return { ...r, prediction: preds };
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
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update status"),
  });

  const referralsList = refQ.data ?? DEMO_REFERRALS;

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
            {counselorQ.data?.email ?? me?.email ?? "Academic Guidance & Intervention Center"}
          </p>
        </div>

        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Assigned Referrals &amp; AI Diagnostics</h2>
              <p className="text-sm text-muted-foreground">Students flagged by AI Early Warning System requiring counselor intervention.</p>
            </div>
          </div>

          {refQ.isLoading ? (
            <Loading />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {referralsList.map((r: any) => {
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

                    <div className="mt-3 text-base font-semibold">{r.students?.student_name ?? r.student_name ?? r.matric_no}</div>
                    <div className="text-[12px] text-muted-foreground">
                      Matric: <span className="font-mono text-foreground font-medium">{r.matric_no}</span> · {r.students?.department ?? r.department} · L{r.students?.level ?? r.level}
                    </div>

                    <div className="mt-3 text-sm">
                      <span className="text-muted-foreground">Referral Reason: </span>
                      <span className="font-medium text-foreground">{r.referral_reason}</span>
                    </div>

                    <div className="mt-2 text-[13px] text-muted-foreground">
                      CGPA at referral: <span className="font-semibold text-foreground">{Number(r.cgpa_at_referral).toFixed(2)}</span>
                      {r.meeting_deadline && ` · Meet by ${new Date(r.meeting_deadline).toLocaleDateString()}`}
                    </div>

                    {pred?.risk_probability && (
                      <div className="mt-3 rounded-xl bg-primary/10 border border-primary/20 p-2.5 text-[12px] text-muted-foreground">
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
      <Loader2 className="size-4 animate-spin" /> Loading referrals...
    </div>
  );
}

function tone(s: string) {
  if (s === "COMPLETED") return "bg-success/15 text-success";
  if (s === "PENDING") return "bg-warning/15 text-warning";
  return "bg-destructive/15 text-destructive";
}
