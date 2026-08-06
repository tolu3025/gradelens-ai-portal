import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/use-current-user";
import { AppNav, PageHeader } from "@/components/AppNav";
import { Icon3d } from "@/components/Icon3d";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const { data: me } = useCurrentUser();

  const q = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cgpa_summary")
        .select("matric_no, student_name, cgpa, classification, level, total_credit_units")
        .order("cgpa", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen">
      <AppNav role={me?.primaryRole ?? null} name={me?.fullName ?? undefined} />
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-8 md:pt-12">
        <PageHeader
          eyebrow="Leaderboard"
          title="Top of the class"
          subtitle="The 50 highest CGPAs across the system, ranked."
          icon={<Icon3d name="trophy" size={88} priority />}
        />

        <section className="mt-8">
          {q.isLoading ? (
            <Loading />
          ) : (q.data?.length ?? 0) === 0 ? (
            <Empty text="Visible records will appear here as CGPAs are computed." />
          ) : (
            <div className="space-y-2">
              {q.data!.map((row, i) => (
                <Row key={row.matric_no} rank={i + 1} row={row} me={me?.matricNo} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Row({ rank, row, me }: { rank: number; row: any; me?: string | null }) {
  const isMe = me && row.matric_no === me;
  const rankTone =
    rank === 1 ? "from-amber-400/30 to-amber-200/10 text-amber-200"
    : rank === 2 ? "from-zinc-200/25 to-zinc-100/5 text-zinc-100"
    : rank === 3 ? "from-orange-400/25 to-orange-200/5 text-orange-200"
    : "from-primary/15 to-primary/0 text-foreground";

  return (
    <div className={`card-elevated flex items-center gap-4 rounded-2xl p-4 transition hover:-translate-y-0.5 ${isMe ? "ring-2 ring-primary/50" : ""}`}>
      <div className={`flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${rankTone} font-semibold tabular-nums`}>
        #{rank}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{row.student_name ?? row.matric_no}</span>
          {isMe && <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">You</span>}
        </div>
        <div className="text-[12px] text-muted-foreground">
          {row.matric_no} · L{row.level} · {row.classification}
        </div>
      </div>
      <div className="text-right">
        <div className="text-2xl font-bold tabular-nums text-gradient">{Number(row.cgpa).toFixed(2)}</div>
        <div className="text-[11px] text-muted-foreground">{row.total_credit_units} CU</div>
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="card-elevated flex items-center gap-2 rounded-2xl p-6 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" /> Loading rankings…
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">{text}</div>;
}
