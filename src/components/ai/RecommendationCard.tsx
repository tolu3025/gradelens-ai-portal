import { Compass, CheckCircle2, Cpu, BookOpen } from "lucide-react";

interface RecommendationCardProps {
  riskLevel: string;
  recommendations: string[];
  actionPlan?: string[];
  isMLPowered?: boolean;
}

export function RecommendationCard({
  riskLevel,
  recommendations,
  actionPlan = [],
  isMLPowered = false,
}: RecommendationCardProps) {
  const isHigh = riskLevel.toUpperCase().includes("HIGH");
  const isMedium = riskLevel.toUpperCase().includes("MEDIUM");

  const headerTone = isHigh ? "text-destructive" : isMedium ? "text-warning" : "text-success";

  return (
    <div className="card-elevated rounded-3xl p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground font-semibold">
          <Compass className={`size-4 ${headerTone}`} />
          AI Recommended Action Plan
        </div>

        {/* ML-powered vs Rule-based badge */}
        <div
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            isMLPowered
              ? "bg-primary/10 text-primary"
              : "bg-muted/50 text-muted-foreground"
          }`}
        >
          {isMLPowered ? (
            <Cpu className="size-3" />
          ) : (
            <BookOpen className="size-3" />
          )}
          {isMLPowered ? "Real-time ML Suggestions" : "Rule-based Suggestions"}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {recommendations.map((rec, i) => (
          <div key={i} className="flex items-start gap-3 rounded-2xl border border-border/60 bg-surface/50 p-4">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
              {i + 1}
            </div>
            <p className="text-sm font-medium text-foreground leading-relaxed">{rec}</p>
          </div>
        ))}
      </div>

      {actionPlan.length > 0 && (
        <div className="mt-6 border-t border-border/60 pt-5">
          <h4 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">
            Immediate Action Checklist
          </h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {actionPlan.map((action, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs text-foreground bg-accent/30 rounded-xl px-3 py-2">
                <CheckCircle2 className="size-3.5 text-success shrink-0" />
                <span>{action}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
