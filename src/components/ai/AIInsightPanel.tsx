import { useEffect, useRef } from "react";
import { RiskCard } from "./RiskCard";
import { PredictionCard } from "./PredictionCard";
import { TrendChart } from "./TrendChart";
import { RecommendationCard } from "./RecommendationCard";
import { useMLPrediction } from "@/lib/use-ml-prediction";
import { BrainCircuit, RefreshCw, Wifi, WifiOff, Loader2 } from "lucide-react";

interface AIInsightPanelProps {
  matricNo: string;
  currentCgpa: number;
  pastGpas: number[];
  failedCoursesCount: number;
  totalCreditUnits: number;
  pastSemesters?: { label: string; gpa: number }[];
}

export function AIInsightPanel({
  matricNo,
  currentCgpa,
  pastGpas,
  failedCoursesCount,
  totalCreditUnits,
  pastSemesters = [],
}: AIInsightPanelProps) {
  const { prediction, isLoading, isMLOnline, run } = useMLPrediction();

  // Track the last input signature to avoid duplicate calls
  const lastSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    // Only run when we have meaningful data (CGPA > 0 OR some past GPAs)
    const hasData = currentCgpa > 0 || pastGpas.length > 0;
    if (!hasData) return;

    // Build a signature to detect actual data changes
    const sig = `${matricNo}|${currentCgpa}|${pastGpas.join(",")}|${failedCoursesCount}|${totalCreditUnits}`;
    if (sig === lastSignatureRef.current) return;
    lastSignatureRef.current = sig;

    run({
      matricNo,
      currentCgpa,
      pastGpas,
      failedCoursesCount,
      totalCreditUnits,
    });
  }, [matricNo, currentCgpa, pastGpas, failedCoursesCount, totalCreditUnits, run]);

  const handleRecalculate = () => {
    // Force re-run by clearing signature, then call run
    lastSignatureRef.current = null;
    run({
      matricNo,
      currentCgpa,
      pastGpas,
      failedCoursesCount,
      totalCreditUnits,
    });
  };

  const semesterPoints =
    pastSemesters.length > 0
      ? pastSemesters
      : pastGpas.map((gpa, i) => ({ label: `Sem ${i + 1}`, gpa }));

  return (
    <section className="space-y-6">
      {/* Header Banner */}
      <div className="card-elevated rounded-3xl p-6 md:p-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <BrainCircuit className="size-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              Academic Early Warning &amp; Predictive Intelligence
            </h2>
            <p className="text-xs text-muted-foreground">
              Powered by Machine Learning (Decision Tree &amp; Linear Regression models)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* ML Online/Offline status badge */}
          {prediction && (
            <div
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${
                isMLOnline
                  ? "bg-success/15 text-success"
                  : "bg-muted/50 text-muted-foreground"
              }`}
            >
              {isMLOnline ? (
                <Wifi className="size-3" />
              ) : (
                <WifiOff className="size-3" />
              )}
              {isMLOnline ? "ML Model Live" : "Rule-based Fallback"}
            </div>
          )}

          <button
            onClick={handleRecalculate}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-full border border-border bg-surface/60 px-4 py-2 text-xs font-semibold hover:bg-accent transition disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>{isLoading ? "Analyzing…" : "Refresh AI Analysis"}</span>
          </button>
        </div>
      </div>

      {/* Loading state — first run */}
      {isLoading && !prediction && (
        <div className="card-elevated rounded-3xl p-12 flex flex-col items-center justify-center gap-4">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold">Running AI Analysis…</p>
            <p className="text-xs text-muted-foreground mt-1">
              Querying ML model for risk prediction &amp; grade forecast
            </p>
          </div>
        </div>
      )}

      {/* Results — only render once we have a real prediction */}
      {prediction && (
        <>
          {/* Grid Layout: Risk Card & Prediction Card */}
          <div className="grid gap-6 lg:grid-cols-2">
            <RiskCard
              riskLevel={prediction.riskLevel}
              riskProbability={prediction.riskProbability}
              confidencePercentage={prediction.confidencePercentage}
              decisionReason={prediction.decisionReason}
              failedCoursesCount={failedCoursesCount}
            />

            <PredictionCard
              currentCgpa={currentCgpa}
              predictedNextGpa={prediction.predictedNextGpa}
              predictedExpectedCgpa={prediction.predictedExpectedCgpa}
              trendDirection={prediction.trendDirection}
              trendSlope={prediction.trendSlope}
            />
          </div>

          {/* Trend Graph Chart */}
          <TrendChart
            pastSemesters={semesterPoints}
            predictedNextGpa={prediction.predictedNextGpa}
            trendSlope={prediction.trendSlope}
          />

          {/* Personal Recommendations */}
          <RecommendationCard
            riskLevel={prediction.riskLevel}
            recommendations={prediction.recommendations}
            actionPlan={prediction.actionPlan}
            isMLPowered={isMLOnline}
          />
        </>
      )}
    </section>
  );
}
