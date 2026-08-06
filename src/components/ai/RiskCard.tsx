import { AlertTriangle, CheckCircle2, AlertCircle, ShieldAlert } from "lucide-react";

interface RiskCardProps {
  riskLevel: string;
  riskProbability: number;
  confidencePercentage?: number;
  decisionReason?: string;
  failedCoursesCount?: number;
}

export function RiskCard({
  riskLevel,
  riskProbability,
  confidencePercentage,
  decisionReason,
  failedCoursesCount = 0
}: RiskCardProps) {
  const isHigh = riskLevel.toUpperCase().includes("HIGH");
  const isMedium = riskLevel.toUpperCase().includes("MEDIUM");
  const isLow = riskLevel.toUpperCase().includes("LOW");

  const pct = confidencePercentage ?? Math.round(riskProbability * 100);

  const badgeStyle = isHigh
    ? "bg-destructive/15 text-destructive border-destructive/30"
    : isMedium
    ? "bg-warning/15 text-warning border-warning/30"
    : "bg-success/15 text-success border-success/30";

  const progressGradient = isHigh
    ? "linear-gradient(90deg, #ef4444, #f87171)"
    : isMedium
    ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
    : "linear-gradient(90deg, #10b981, #34d399)";

  return (
    <div className="card-elevated relative overflow-hidden rounded-3xl p-6 md:p-8 transition hover:-translate-y-0.5">
      <div
        aria-hidden
        className="absolute -right-16 -top-16 size-48 rounded-full opacity-40 blur-3xl pointer-events-none"
        style={{
          background: isHigh
            ? "radial-gradient(circle, oklch(0.6 0.22 25 / 0.5), transparent)"
            : isMedium
            ? "radial-gradient(circle, oklch(0.7 0.18 70 / 0.5), transparent)"
            : "radial-gradient(circle, oklch(0.7 0.18 150 / 0.5), transparent)",
        }}
      />

      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground font-semibold">
            {isHigh ? <ShieldAlert className="size-4 text-destructive" /> : isMedium ? <AlertTriangle className="size-4 text-warning" /> : <CheckCircle2 className="size-4 text-success" />}
            AI Academic Risk Assessment
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold tracking-wide ${badgeStyle}`}>
            {riskLevel}
          </span>
        </div>

        <div className="mt-6 flex flex-wrap items-baseline gap-3">
          <span className="text-4xl font-extrabold tracking-tight text-gradient md:text-5xl">
            {riskLevel}
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            ({pct}% AI Model Confidence)
          </span>
        </div>

        {/* Confidence Probability Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-[11px] font-medium text-muted-foreground mb-1.5">
            <span>Risk Probability Index</span>
            <span className="tabular-nums font-semibold">{pct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/80">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${pct}%`, background: progressGradient }}
            />
          </div>
        </div>

        {decisionReason && (
          <div className="mt-5 rounded-2xl border border-border/60 bg-surface/60 p-3.5 text-xs text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">AI Diagnostic Rationale: </span>
            {decisionReason}
          </div>
        )}

        {failedCoursesCount > 0 && (
          <div className="mt-3 flex items-center gap-2 text-xs text-destructive font-medium">
            <AlertCircle className="size-3.5" />
            <span>{failedCoursesCount} failed course(s) detected affecting risk index.</span>
          </div>
        )}
      </div>
    </div>
  );
}
