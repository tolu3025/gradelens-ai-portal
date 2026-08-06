import { Activity } from "lucide-react";

interface TrendPoint {
  label: string;
  gpa: number;
}

interface TrendChartProps {
  pastSemesters: TrendPoint[];
  predictedNextGpa?: number;
  trendSlope?: number;
}

export function TrendChart({ pastSemesters, predictedNextGpa, trendSlope = 0 }: TrendChartProps) {
  const points: { label: string; value: number; isPredicted?: boolean }[] = pastSemesters.map((p) => ({
    label: p.label,
    value: Number(p.gpa.toFixed(2)),
    isPredicted: false,
  }));

  if (predictedNextGpa !== undefined) {
    points.push({
      label: "Next (AI)",
      value: Number(predictedNextGpa.toFixed(2)),
      isPredicted: true,
    });
  }

  const max = 5.0;
  const w = 640;
  const h = 210;
  const pad = 32;
  const n = points.length;

  if (n === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
        No semester GPA data available to plot trend graph.
      </div>
    );
  }

  const x = (i: number) => pad + (i * (w - pad * 2)) / Math.max(1, n - 1);
  const y = (v: number) => h - pad - (v / max) * (h - pad * 2);

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.value)}`).join(" ");
  const area = `${path} L ${x(n - 1)} ${h - pad} L ${x(0)} ${h - pad} Z`;

  return (
    <div className="card-elevated rounded-3xl p-6 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground font-semibold">
            <Activity className="size-4 text-primary" />
            GPA Trajectory & Regression Model Line
          </div>
          <h4 className="mt-1 text-sm font-semibold">Semester-by-Semester Progress</h4>
        </div>
        <div className="text-right">
          <div className="text-xs font-semibold text-muted-foreground">Regression Slope ($m$)</div>
          <div className={`text-sm font-bold tabular-nums ${trendSlope >= 0 ? "text-success" : "text-destructive"}`}>
            {trendSlope >= 0 ? `+${trendSlope.toFixed(3)}` : trendSlope.toFixed(3)} / sem
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <svg viewBox={`0 0 ${w} ${h}`} className="h-56 w-full min-w-[500px]">
          <defs>
            <linearGradient id="aiTrendGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.7 0.18 250)" stopOpacity="0.45" />
              <stop offset="100%" stopColor="oklch(0.7 0.18 250)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines */}
          {[0, 1.0, 2.0, 2.5, 3.5, 4.5, 5.0].map((g) => (
            <g key={g}>
              <line
                x1={pad}
                x2={w - pad}
                y1={y(g)}
                y2={y(g)}
                stroke="currentColor"
                className="text-border/60"
                strokeWidth="1"
                strokeDasharray={g === 2.5 || g === 3.5 ? "4 4" : "2 4"}
              />
              <text x={pad - 8} y={y(g) + 3} textAnchor="end" className="fill-muted-foreground/60" style={{ fontSize: 9 }}>
                {g.toFixed(1)}
              </text>
            </g>
          ))}

          {/* Area under curve */}
          <path d={area} fill="url(#aiTrendGrad)" />

          {/* Main trend line */}
          <path
            d={path}
            fill="none"
            stroke="oklch(0.7 0.18 250)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points */}
          {points.map((p, i) => {
            const px = x(i);
            const py = y(p.value);
            return (
              <g key={i}>
                <circle
                  cx={px}
                  cy={py}
                  r={p.isPredicted ? "6" : "4.5"}
                  fill={p.isPredicted ? "oklch(0.75 0.2 150)" : "oklch(0.99 0 0)"}
                  stroke="oklch(0.7 0.18 250)"
                  strokeWidth="2.5"
                />
                <text
                  x={px}
                  y={h - 8}
                  textAnchor="middle"
                  className={p.isPredicted ? "fill-primary font-bold" : "fill-muted-foreground"}
                  style={{ fontSize: 10 }}
                >
                  {p.label}
                </text>
                <text
                  x={px}
                  y={py - 12}
                  textAnchor="middle"
                  className={p.isPredicted ? "fill-success font-bold" : "fill-foreground font-semibold"}
                  style={{ fontSize: 10 }}
                >
                  {p.value.toFixed(2)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
