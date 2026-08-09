import { useState } from "react";

interface Point {
  period: string;
  eps: number;
}

const COLOR = "#7aa2f7";
const NEGATIVE_COLOR = "#e06c75";

export function EpsBarChart({ history }: { history: Point[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (history.length < 2) {
    return <div className="chart-empty">Not enough quarterly data yet.</div>;
  }

  const width = 280;
  const height = 64;
  const pad = 4;
  const values = history.map((p) => p.eps);
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const zeroY = height - pad - ((0 - min) / range) * (height - pad * 2);

  const slot = (width - pad * 2) / history.length;
  const barWidth = Math.max(2, slot - 2);

  const hovered = hoverIndex !== null ? history[hoverIndex] : null;

  return (
    <div className="bar-chart">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="bar-chart-svg">
        <line x1={pad} x2={width - pad} y1={zeroY} y2={zeroY} stroke="#2a2e37" strokeWidth={1} />
        {history.map((p, i) => {
          const barColor = p.eps >= 0 ? COLOR : NEGATIVE_COLOR;
          const barY = p.eps >= 0 ? ((max - p.eps) / range) * (height - pad * 2) + pad : zeroY;
          const barH = (Math.abs(p.eps) / range) * (height - pad * 2);
          const x = pad + i * slot + (slot - barWidth) / 2;
          return (
            <rect
              key={p.period}
              x={x}
              y={barY}
              width={barWidth}
              height={Math.max(1, barH)}
              fill={barColor}
              opacity={hoverIndex === null || hoverIndex === i ? 1 : 0.4}
              rx={1}
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
            />
          );
        })}
      </svg>
      <div className="bar-chart-labels">
        <span>{history[0].period.slice(0, 7)}</span>
        <span>{history[history.length - 1].period.slice(0, 7)}</span>
      </div>
      {hovered && (
        <div className="chart-tooltip">
          {hovered.period}: EPS {hovered.eps.toFixed(2)}
        </div>
      )}
    </div>
  );
}
