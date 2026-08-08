import { useState } from "react";

interface Point {
  t: number;
  c: number;
}

interface Props {
  history: Point[];
  color: string;
  width?: number;
  height?: number;
}

function formatTime(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function Sparkline({ history, color, width = 280, height = 56 }: Props) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const points = history.filter((p) => typeof p.c === "number");
  if (points.length < 2) {
    return <div className="sparkline-empty">Collecting price history…</div>;
  }

  const values = points.map((p) => p.c);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = 4;
  const range = max - min || 1;

  const xFor = (i: number) => (i / (points.length - 1)) * (width - pad * 2) + pad;
  const yFor = (v: number) => height - pad - ((v - min) / range) * (height - pad * 2);

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${xFor(i)},${yFor(p.c)}`).join(" ");
  const areaPath = `${linePath} L${xFor(points.length - 1)},${height} L${xFor(0)},${height} Z`;

  const gradientId = `sparkline-fill-${color.replace("#", "")}`;

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * width;
    const i = Math.round(((relX - pad) / (width - pad * 2)) * (points.length - 1));
    setHoverIndex(Math.min(points.length - 1, Math.max(0, i)));
  }

  const hovered = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div className="sparkline">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="sparkline-svg"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
        <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {hovered && (
          <>
            <line
              x1={xFor(hoverIndex!)}
              x2={xFor(hoverIndex!)}
              y1={pad}
              y2={height - pad}
              stroke={color}
              strokeOpacity={0.35}
              strokeWidth={1}
            />
            <circle cx={xFor(hoverIndex!)} cy={yFor(hovered.c)} r={3} fill={color} />
          </>
        )}
      </svg>
      {hovered && (
        <div className="sparkline-tooltip">
          {hovered.c.toFixed(2)} · {formatTime(hovered.t)}
        </div>
      )}
    </div>
  );
}
