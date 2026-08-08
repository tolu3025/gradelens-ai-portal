import { useState, useCallback, useRef } from "react";
import {
  calculateAcademicRiskAndPrediction,
  RiskPredictionResult,
} from "./ai-warning-system";

/** Base URL for the Python ML microservice */
const ML_API_URL =
  (import.meta as any).env?.VITE_ML_API_URL ?? "http://localhost:8000";

export interface MLPredictionInput {
  matricNo: string;
  currentCgpa: number;
  pastGpas: number[];
  failedCoursesCount: number;
  totalCreditUnits: number;
  referralsCount?: number;
  attendancePct?: number;
}

export interface MLPredictionState {
  prediction: RiskPredictionResult | null;
  isLoading: boolean;
  isMLOnline: boolean;
  error: string | null;
}

async function fetchWithTimeout(url: string, opts: RequestInit, ms = 6000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

/**
 * Computes the linear regression trend slope from an array of GPA values.
 */
function computeTrendSlope(gpas: number[]): number {
  const n = gpas.length;
  if (n < 2) return 0;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += gpas[i]!;
    sumXY += i * gpas[i]!;
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  return denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
}

/**
 * Calls the Python ML microservice and returns a full RiskPredictionResult.
 * Falls back to the TypeScript rule engine if the server is unreachable.
 *
 * Returns { result, isMLOnline }.
 */
async function fetchMLPrediction(input: MLPredictionInput): Promise<{
  result: RiskPredictionResult;
  isMLOnline: boolean;
}> {
  const trendSlope = computeTrendSlope(input.pastGpas);
  const prevGpa =
    input.pastGpas.length > 0
      ? input.pastGpas[input.pastGpas.length - 1]!
      : input.currentCgpa;

  // ── Try calling the Python ML microservice ──────────────────────────────
  try {
    const [riskRes, cgpaRes] = await Promise.all([
      fetchWithTimeout(
        `${ML_API_URL}/predict-risk`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cgpa: input.currentCgpa,
            prev_gpa: prevGpa,
            failed_courses: input.failedCoursesCount,
            referrals: input.referralsCount ?? 0,
            credit_units: Math.max(input.totalCreditUnits, 18),
            attendance: input.attendancePct ?? 85.0,
            trend_slope: trendSlope,
          }),
        },
        6000
      ),
      fetchWithTimeout(
        `${ML_API_URL}/predict-cgpa`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            past_gpas:
              input.pastGpas.length > 0 ? input.pastGpas : [input.currentCgpa],
            current_cgpa: input.currentCgpa,
            total_credit_units: Math.max(input.totalCreditUnits, 1),
            next_semester_units: 21,
          }),
        },
        6000
      ),
    ]);

    if (!riskRes.ok || !cgpaRes.ok) throw new Error("ML server returned error");

    const riskData = await riskRes.json();
    const cgpaData = await cgpaRes.json();

    // Fetch real-time recommendations from ML server
    const recRes = await fetchWithTimeout(
      `${ML_API_URL}/recommendation?risk_level=${encodeURIComponent(riskData.risk_level)}&trend_direction=${encodeURIComponent(riskData.trend_direction)}`,
      { method: "GET" },
      5000
    );
    const recData = recRes.ok ? await recRes.json() : null;

    // Build the result from ML server responses
    const mlResult: RiskPredictionResult = {
      riskLevel: riskData.risk_level as RiskPredictionResult["riskLevel"],
      riskProbability: riskData.risk_probability,
      confidencePercentage: riskData.confidence_percentage,
      trendDirection: riskData.trend_direction as RiskPredictionResult["trendDirection"],
      trendSlope: cgpaData.trend_slope,
      predictedNextGpa: cgpaData.predicted_next_gpa,
      predictedExpectedCgpa: cgpaData.predicted_expected_cgpa,
      recommendations: recData?.recommendations ?? [],
      actionPlan: recData?.action_plan ?? [],
      decisionReason: riskData.decision_reason,
    };

    // Augment with TypeScript engine's additional context-aware suggestions
    const tsResult = calculateAcademicRiskAndPrediction({
      matricNo: input.matricNo,
      currentCgpa: input.currentCgpa,
      pastGpas: input.pastGpas,
      failedCoursesCount: input.failedCoursesCount,
      totalCreditUnits: input.totalCreditUnits,
      referralsCount: input.referralsCount,
      attendancePct: input.attendancePct,
    });

    // Merge: ML server for core risk/prediction, TS engine for extra personalised recs
    const extraRecs = tsResult.recommendations.filter(
      (r) => !mlResult.recommendations.some((mr) => mr.slice(0, 30) === r.slice(0, 30))
    );
    const extraActions = tsResult.actionPlan.filter(
      (a) => !mlResult.actionPlan.some((ma) => ma.slice(0, 20) === a.slice(0, 20))
    );

    mlResult.recommendations = [...mlResult.recommendations, ...extraRecs];
    mlResult.actionPlan = [...mlResult.actionPlan, ...extraActions];

    return { result: mlResult, isMLOnline: true };
  } catch (_err) {
    // ── ML server offline — fall back to TypeScript rule engine ──────────
    const tsResult = calculateAcademicRiskAndPrediction({
      matricNo: input.matricNo,
      currentCgpa: input.currentCgpa,
      pastGpas: input.pastGpas,
      failedCoursesCount: input.failedCoursesCount,
      totalCreditUnits: input.totalCreditUnits,
      referralsCount: input.referralsCount,
      attendancePct: input.attendancePct,
    });
    return { result: tsResult, isMLOnline: false };
  }
}

/**
 * React hook for real-time ML-powered academic prediction.
 *
 * - Calls the Python ML microservice on `run(input)`.
 * - Falls back to TypeScript rule engine when the server is unreachable.
 * - Exposes `isMLOnline` so the UI can show an indicator badge.
 */
export function useMLPrediction() {
  const [state, setState] = useState<MLPredictionState>({
    prediction: null,
    isLoading: false,
    isMLOnline: false,
    error: null,
  });

  // Guard against running stale requests
  const runningRef = useRef(false);

  const run = useCallback(async (input: MLPredictionInput) => {
    // Don't re-run if already loading
    if (runningRef.current) return;

    // Don't run with invalid/empty data
    if (
      input.currentCgpa === 0 &&
      input.pastGpas.length === 0 &&
      input.totalCreditUnits === 0
    ) {
      return;
    }

    runningRef.current = true;
    setState((s) => ({ ...s, isLoading: true, error: null }));

    try {
      const { result, isMLOnline } = await fetchMLPrediction(input);
      setState({ prediction: result, isLoading: false, isMLOnline, error: null });
    } catch (e: any) {
      setState((s) => ({
        ...s,
        isLoading: false,
        error: e?.message ?? "Unknown error",
      }));
    } finally {
      runningRef.current = false;
    }
  }, []);

  const reset = useCallback(() => {
    runningRef.current = false;
    setState({ prediction: null, isLoading: false, isMLOnline: false, error: null });
  }, []);

  return { ...state, run, reset };
}
