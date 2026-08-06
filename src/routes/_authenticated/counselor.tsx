import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/use-current-user";
import { AppNav, PageHeader } from "@/components/AppNav";
import { Icon3d } from "@/components/Icon3d";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  InboxIcon,
  Search,
  Filter,
  AlertTriangle,
  UserCheck,
  Calendar,
  FileText,
  Save,
  Clock,
  Sparkles,
  TrendingDown,
  BrainCircuit,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/counselor")({
  component: CounselorPage,
});

function CounselorPage() {
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "COMPLETED" | "MISSED">("ALL");
  const [editingNotesId, setEditingNotesId] = useState<number | null>(null);
  const [noteInput, setNoteInput] = useState("");

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
            .select("risk_level, risk_probability, recommendations, predicted_gpa")
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
    mutationFn: async ({ id, status, notes }: { id: number; status?: "COMPLETED" | "MISSED" | "PENDING"; notes?: string }) => {
      const payload: any = {};
      if (status) payload.status = status;
      if (notes !== undefined) payload.counselor_notes = notes;

      const { error } = await supabase.from("counselor_referrals").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Case updated successfully");
      setEditingNotesId(null);
      qc.invalidateQueries({ queryKey: ["counselor-refs"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update case"),
  });

  // Calculate Key Analytics Stats
  const stats = useMemo(() => {
    const list = refQ.data ?? [];
    let pending = 0;
    let completed = 0;
    let highRisk = 0;

    for (const r of list) {
      if (r.status === "PENDING") pending++;
      if (r.status === "COMPLETED") completed++;
      const rLevel = r.prediction?.risk_level || (r.cgpa_at_referral < 2.5 ? "High Risk" : "Medium Risk");
      if (rLevel.toUpperCase().includes("HIGH")) highRisk++;
    }

    return {
      total: list.length,
      pending,
      completed,
      highRisk,
    };
  }, [refQ.data]);

  // Filter referrals by Search and Status
  const filteredReferrals = useMemo(() => {
    const list = refQ.data ?? [];
    const q = searchQuery.trim().toLowerCase();

    return list.filter((r: any) => {
      const matchSearch =
        !q ||
        (r.students?.student_name && r.students.student_name.toLowerCase().includes(q)) ||
        (r.matric_no && r.matric_no.toLowerCase().includes(q)) ||
        (r.students?.department && r.students.department.toLowerCase().includes(q));

      const matchStatus = statusFilter === "ALL" || r.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [refQ.data, searchQuery, statusFilter]);

  return (
    <div className="min-h-screen">
      <AppNav role="counselor" name={me?.fullName ?? undefined} />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-8 md:pt-12">
        <PageHeader
          eyebrow="Counselor Portal"
          title={counselorQ.data?.full_name ?? me?.fullName ?? "Counselor Dashboard"}
          subtitle="Academic Guidance, AI Early Warning Case Files & Intervention Analytics."
          icon={<Icon3d name="people" size={64} />}
        />

        {/* ANALYTICS STATS OVERVIEW CARDS */}
        <section className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Total Assigned Cases"
            value={stats.total}
            sub="Active student referrals"
            icon={<BrainCircuit className="size-5 text-primary" />}
          />
          <StatCard
            label="High Risk Warnings"
            value={stats.highRisk}
            sub="Urgent AI flags"
            icon={<AlertTriangle className="size-5 text-destructive" />}
          />
          <StatCard
            label="Pending Action"
            value={stats.pending}
            sub="Awaiting sessions"
            icon={<Clock className="size-5 text-warning" />}
          />
          <StatCard
            label="Completed Sessions"
            value={stats.completed}
            sub="Resolved interventions"
            icon={<CheckCircle2 className="size-5 text-success" />}
          />
        </section>

        {/* SEARCH & FILTERS SECTION */}
        <section className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl card-elevated p-4">
          <div className="flex flex-1 items-center gap-2 rounded-full glass px-4 py-2 text-sm">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student name, matric number, department…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Filter className="size-4 text-muted-foreground" />
            {(["ALL", "PENDING", "COMPLETED", "MISSED"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  statusFilter === st
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary/70 text-muted-foreground hover:text-foreground"
                }`}
              >
                {st === "ALL" ? "All Cases" : st}
              </button>
            ))}
          </div>
        </section>

        {/* CASE FILES LIST */}
        <section className="mt-8">
          {!counselorQ.isLoading && !counselorQ.data ? (
            <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border p-12 text-center card-elevated">
              <InboxIcon className="size-12 text-muted-foreground/40" />
              <h3 className="text-base font-semibold">Account Link Required</h3>
              <p className="max-w-md text-xs text-muted-foreground">
                Your login email is not yet linked to an active Counselor Profile. Ask an Administrator to assign your Counselor Role under Admin Tools.
              </p>
            </div>
          ) : refQ.isLoading || counselorQ.isLoading ? (
            <LoadingBlock />
          ) : filteredReferrals.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border p-12 text-center card-elevated">
              <InboxIcon className="size-12 text-muted-foreground/40" />
              <h3 className="text-base font-semibold">No Referrals Found</h3>
              <p className="max-w-md text-xs text-muted-foreground">
                {searchQuery || statusFilter !== "ALL"
                  ? "No cases match your active search filter."
                  : "Referrals will appear here when the AI system flags at-risk students or faculty make manual referrals."}
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {filteredReferrals.map((r: any) => {
                const pred = r.prediction;
                const riskLevel = pred?.risk_level ?? (r.cgpa_at_referral < 2.5 ? "High Risk" : "Medium Risk");
                const isEditingThisNote = editingNotesId === r.id;

                return (
                  <div key={r.id} className="card-elevated relative overflow-hidden rounded-3xl p-6 border border-border/80 bg-card">
                    {/* TOP BADGES */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${statusTone(r.status)}`}>
                          {r.status}
                        </span>
                        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${riskTone(riskLevel)}`}>
                          AI Warning: {riskLevel}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                        <Calendar className="size-3" /> {new Date(r.referred_at).toLocaleDateString()}
                      </span>
                    </div>

                    {/* STUDENT DETAILS */}
                    <div className="mt-4">
                      <h3 className="text-lg font-bold text-foreground">{r.students?.student_name ?? r.matric_no}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground font-medium">
                        <span>Matric: <strong className="font-mono text-foreground">{r.matric_no}</strong></span>
                        {r.students?.department && <span>· {r.students.department}</span>}
                        {r.students?.level && <span>· L{r.students.level}</span>}
                      </div>
                    </div>

                    {/* REFERRAL REASON */}
                    <div className="mt-4 rounded-2xl bg-surface/70 border border-border/60 p-3.5 text-xs">
                      <span className="font-semibold text-foreground">Referral Reason: </span>
                      <span className="text-muted-foreground">{r.referral_reason}</span>
                    </div>

                    {/* AI DIAGNOSTICS STATS */}
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-secondary/50 p-3 text-xs">
                        <div className="text-[11px] text-muted-foreground font-medium">CGPA at Referral</div>
                        <div className="mt-1 text-lg font-bold text-foreground">{Number(r.cgpa_at_referral).toFixed(2)} / 5.00</div>
                      </div>
                      <div className="rounded-2xl bg-primary/10 border border-primary/20 p-3 text-xs">
                        <div className="text-[11px] text-primary font-medium">AI Risk Probability</div>
                        <div className="mt-1 text-lg font-bold text-primary">
                          {pred?.risk_probability ? `${(Number(pred.risk_probability) * 100).toFixed(1)}%` : "High Warning"}
                        </div>
                      </div>
                    </div>

                    {/* AI RECOMMENDATIONS */}
                    {pred?.recommendations && (
                      <div className="mt-3 text-xs text-muted-foreground flex items-start gap-1.5">
                        <Sparkles className="size-3.5 text-primary shrink-0 mt-0.5" />
                        <span><strong>AI Recommendation:</strong> {pred.recommendations}</span>
                      </div>
                    )}

                    {/* COUNSELOR NOTES SECTION */}
                    <div className="mt-4 border-t border-border/60 pt-4">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <FileText className="size-3.5" /> Counselor Session Notes
                        </span>
                        {!isEditingThisNote && (
                          <button
                            onClick={() => {
                              setEditingNotesId(r.id);
                              setNoteInput(r.counselor_notes ?? "");
                            }}
                            className="text-primary hover:underline text-[11px]"
                          >
                            {r.counselor_notes ? "Edit Notes" : "+ Add Session Notes"}
                          </button>
                        )}
                      </div>

                      {isEditingThisNote ? (
                        <div className="mt-2 space-y-2">
                          <textarea
                            value={noteInput}
                            onChange={(e) => setNoteInput(e.target.value)}
                            placeholder="Type session intervention notes, student commitment, or action plan..."
                            className="w-full rounded-xl border border-input bg-card p-3 text-xs outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                            rows={3}
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => setEditingNotesId(null)}
                              className="rounded-full bg-secondary px-3 py-1.5 text-[11px] font-medium"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => updateStatus.mutate({ id: r.id, notes: noteInput })}
                              disabled={updateStatus.isPending}
                              className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground hover:opacity-90"
                            >
                              <Save className="size-3" /> Save Notes
                            </button>
                          </div>
                        </div>
                      ) : r.counselor_notes ? (
                        <p className="mt-2 rounded-xl bg-accent/40 p-2.5 text-xs text-foreground font-medium italic">
                          &ldquo;{r.counselor_notes}&rdquo;
                        </p>
                      ) : (
                        <p className="mt-1 text-[11px] text-muted-foreground/60 italic">No notes logged yet.</p>
                      )}
                    </div>

                    {/* STATUS ACTION BUTTONS */}
                    <div className="mt-5 flex items-center gap-2 border-t border-border/60 pt-4">
                      {r.status !== "COMPLETED" && (
                        <button
                          onClick={() => updateStatus.mutate({ id: r.id, status: "COMPLETED" })}
                          disabled={updateStatus.isPending}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-full bg-success/15 py-2 text-xs font-semibold text-success hover:bg-success/25 transition"
                        >
                          <CheckCircle2 className="size-4" /> Mark Completed
                        </button>
                      )}
                      {r.status !== "MISSED" && (
                        <button
                          onClick={() => updateStatus.mutate({ id: r.id, status: "MISSED" })}
                          disabled={updateStatus.isPending}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-full bg-destructive/15 py-2 text-xs font-semibold text-destructive hover:bg-destructive/25 transition"
                        >
                          <XCircle className="size-4" /> Mark Missed
                        </button>
                      )}
                      {r.status !== "PENDING" && (
                        <button
                          onClick={() => updateStatus.mutate({ id: r.id, status: "PENDING" })}
                          disabled={updateStatus.isPending}
                          className="rounded-full bg-secondary px-3 py-2 text-xs font-medium hover:bg-accent transition"
                        >
                          Reopen Case
                        </button>
                      )}
                    </div>
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

function StatCard({ label, value, sub, icon }: { label: string; value: number; sub: string; icon: React.ReactNode }) {
  return (
    <div className="card-elevated rounded-3xl p-5 border border-border/80 bg-card">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        {icon}
      </div>
      <div className="mt-3 text-3xl font-extrabold tracking-tight text-foreground">{value}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function LoadingBlock() {
  return (
    <div className="card-elevated flex items-center justify-center gap-2 rounded-3xl p-12 text-sm text-muted-foreground">
      <Loader2 className="size-5 animate-spin" /> Loading counselor case files…
    </div>
  );
}

function statusTone(s: string) {
  if (s === "COMPLETED") return "bg-success/15 text-success border border-success/30";
  if (s === "PENDING") return "bg-warning/15 text-warning border border-warning/30";
  return "bg-destructive/15 text-destructive border border-destructive/30";
}

function riskTone(r: string) {
  const u = (r || "").toUpperCase();
  if (u.includes("HIGH")) return "bg-destructive/15 text-destructive border border-destructive/30";
  if (u.includes("MEDIUM")) return "bg-warning/15 text-warning border border-warning/30";
  return "bg-success/15 text-success border border-success/30";
}
