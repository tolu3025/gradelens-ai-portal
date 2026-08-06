import { Sparkles, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface PredictionCardProps {
  currentCgpa: number;
  predictedNextGpa: number;
  predictedExpectedCgpa: number;
  trendDirection: "Improving" | "Stable" | "Declining";
  trendSlope: number;
}

export function PredictionCard({
  currentCgpa,
  predictedNextGpa,
  predictedExpectedCgpa,
  trendDirection,
  trendSlope,
}: PredictionCardProps) {
  const isImproving = trendDirection === "Improving" || trendSlope > 0.01;
  const isDeclining = trendDirection === "Declining" || trendSlope < -0.01;

  const deltaGpa = (predictedNextGpa - currentCgpa).toFixed(2);
  const deltaFormatted = Number(deltaGpa) >= 0 ? `+${deltaGpa}` : deltaGpa;

  return (
    <div className="card-elevated rounded-3xl p-6 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground font-semibold">
          <Sparkles className="size-4 text-primary" />
          Linear Regression Forecast
        </div>
        <div
          className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            isImproving
              ? "bg-success/15 text-success"
              : isDeclining
              ? "bg-destructive/15 text-destructive"
              : "bg-primary/15 text-primary"
          }`}
        >
          {isImproving ? <ArrowUpRight className="size-3.5" /> : isDeclining ? <ArrowDownRight className="size-3.5" /> : <TrendingUp className="size-3.5" />}
          <span>{trendDirection}</span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Current CGPA */}
        <div className="rounded-2xl border border-border bg-surface/60 p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Current CGPA</div>
          <div className="mt-1 text-3xl font-bold tabular-nums text-foreground">
            {Number(currentCgpa).toFixed(2)}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">Recorded to date</div>
        </div>

        {/* Predicted Next Semester GPA */}
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 relative overflow-hidden">
          <div className="text-[11px] uppercase tracking-wider text-primary font-semibold">Predicted Next GPA</div>
          <div className="mt-1 text-3xl font-extrabold tabular-nums text-gradient">
            {Number(predictedNextGpa).toFixed(2)}
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            <span>Shift:</span>
            <span className={Number(deltaGpa) >= 0 ? "text-success font-semibold" : "text-destructive font-semibold"}>
              {deltaFormatted}
            </span>
          </div>
        </div>

        {/* Expected Projectable CGPA */}
        <div className="rounded-2xl border border-border bg-surface/60 p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Expected Future CGPA</div>
          <div className="mt-1 text-3xl font-bold tabular-nums text-foreground">
            {Number(predictedExpectedCgpa).toFixed(2)}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">Post-next semester model estimate</div>
        </div>
      </div>
    </div>
  );
}
