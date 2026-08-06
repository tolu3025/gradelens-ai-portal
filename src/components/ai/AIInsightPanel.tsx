import { useState } from "react";
import { RiskCard } from "./RiskCard";
import { PredictionCard } from "./PredictionCard";
import { TrendChart } from "./TrendChart";
import { RecommendationCard } from "./RecommendationCard";
import { calculateAcademicRiskAndPrediction, RiskPredictionResult } from "@/lib/ai-warning-system";
import { BrainCircuit, RefreshCw } from "lucide-react";

interface AIInsightPanelProps {
  matricNo: string;
  currentCgpa: number;
  pastGpas: number[];
  failedCoursesCount: number;
  totalCreditUnits: number;
  pastSemesters?: { label: string; gpa: number }[];
  initialPrediction?: RiskPredictionResult;
}

export function AIInsightPanel({
  matricNo,
  currentCgpa,
  pastGpas,
  failedCoursesCount,
  totalCreditUnits,
  pastSemesters = [],
  initialPrediction,
}: AIInsightPanelProps) {
  const [prediction, setPrediction] = useState<RiskPredictionResult>(() => {
    return (
      initialPrediction ||
      calculateAcademicRiskAndPrediction({
        matricNo,
        currentCgpa,
        pastGpas,
        failedCoursesCount,
        totalCreditUnits,
      })
    );
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRecalculate = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      const res = calculateAcademicRiskAndPrediction({
        matricNo,
        currentCgpa,
        pastGpas,
        failedCoursesCount,
        totalCreditUnits,
      });
      setPrediction(res);
      setIsRefreshing(false);
    }, 400);
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
            <h2 className="text-xl font-bold tracking-tight">Academic Early Warning & Predictive Intelligence</h2>
            <p className="text-xs text-muted-foreground">
              Powered by Machine Learning (Decision Tree & Linear Regression models)
            </p>
          </div>
        </div>

        <button
          onClick={handleRecalculate}
          disabled={isRefreshing}
          className="flex items-center gap-2 rounded-full border border-border bg-surface/60 px-4 py-2 text-xs font-semibold hover:bg-accent transition disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          <span>Refresh AI Analysis</span>
        </button>
      </div>

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
      />
    </section>
  );
}
