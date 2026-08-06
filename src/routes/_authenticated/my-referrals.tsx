import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/use-current-user";
import { AppNav, PageHeader } from "@/components/AppNav";
import { Icon3d } from "@/components/Icon3d";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/my-referrals")({
  component: MyReferralsPage,
});

function MyReferralsPage() {
  const { data: me } = useCurrentUser();
  const matric = me?.matricNo;

  const refQ = useQuery({
    queryKey: ["my-referrals", matric],
    enabled: !!matric,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("counselor_referrals")
        .select("*, counselors(full_name, email)")
        .eq("matric_no", matric!)
        .order("referred_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen">
      <AppNav role="student" name={me?.fullName ?? undefined} />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-8 md:pt-12">
        <PageHeader
          eyebrow="Counseling"
          title="Your referrals"
          subtitle="Conversations your counselor has opened with you."
          icon={<Icon3d name="inbox" size={64} />}
        />
        <div className="mt-8">
          {!matric ? (
            <Empty text="No student record linked." />
          ) : refQ.isLoading ? (
            <Loading />
          ) : (refQ.data?.length ?? 0) === 0 ? (
            <Empty text="No referrals — keep up the good work." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {refQ.data!.map((r: any) => (
                <div key={r.id} className="card-elevated rounded-2xl p-5">
                  <div className="flex items-center justify-between">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusTone(r.status)}`}>{r.status}</span>
                    <span className="text-[11px] text-muted-foreground">CGPA at referral: {Number(r.cgpa_at_referral).toFixed(2)}</span>
                  </div>
                  <div className="mt-3 text-sm font-medium">{r.referral_reason}</div>
                  <div className="mt-1 text-[13px] text-muted-foreground">
                    {r.counselors?.full_name ?? "Unassigned counselor"}
                    {r.counselors?.email && ` · ${r.counselors.email}`}
                  </div>
                  {r.meeting_deadline && (
                    <div className="mt-3 text-[12px] text-muted-foreground">
                      Meet by {new Date(r.meeting_deadline).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
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
  return <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{text}</div>;
}
function statusTone(s: string) {
  if (s === "COMPLETED") return "bg-success/15 text-success";
  if (s === "PENDING") return "bg-warning/15 text-warning";
  return "bg-primary/15 text-primary";
}