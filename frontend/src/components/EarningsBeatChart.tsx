import { useState } from "react";

interface Quarter {
  period: string;
  actual: number | null;
  estimate: number | null;
}

const BEAT_COLOR = "#4caf50";
const MISS_COLOR = "#e06c75";
const ESTIMATE_COLOR = "#888";

export function EarningsBeatChart({ quarters }: { quarters: Quarter[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const usable = quarters.filter((q) => q.actual != null && q.estimate != null);
  if (usable.length === 0) {
    return <div className="chart-empty">No earnings data yet.</div>;
  }

  const width = 280;
  const height = 64;
  const pad = 4;
  const allValues = usable.flatMap((q) => [q.actual!, q.estimate!, 0]);
  const max = Math.max(...allValues);
  const min = Math.min(...allValues);
  const range = max - min || 1;
  const zeroY = height - pad - ((0 - min) / range) * (height - pad * 2);
  const yFor = (v: number) => height - pad - ((v - min) / range) * (height - pad * 2);

  const slot = (width - pad * 2) / usable.length;
  const barWidth = Math.max(3, (slot - 4) / 2);

  const hovered = hoverIndex !== null ? usable[hoverIndex] : null;
  const beat = hovered ? hovered.actual! >= hovered.estimate! : false;

  return (
    <div className="bar-chart">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="bar-chart-svg">
        <line x1={pad} x2={width - pad} y1={zeroY} y2={zeroY} stroke="#2a2e37" strokeWidth={1} />
        {usable.map((q, i) => {
          const groupX = pad + i * slot + (slot - barWidth * 2 - 2) / 2;
          const actualColor = q.actual! >= q.estimate! ? BEAT_COLOR : MISS_COLOR;
          const dimmed = hoverIndex !== null && hoverIndex !== i;
          return (
            <g
              key={q.period}
              opacity={dimmed ? 0.4 : 1}
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
            >
              <rect
                x={groupX}
                y={Math.min(yFor(q.estimate!), zeroY)}
                width={barWidth}
                height={Math.max(1, Math.abs(yFor(q.estimate!) - zeroY))}
                fill="none"
                stroke={ESTIMATE_COLOR}
                strokeWidth={1.5}
                rx={1}
              />
              <rect
                x={groupX + barWidth + 2}
                y={Math.min(yFor(q.actual!), zeroY)}
                width={barWidth}
                height={Math.max(1, Math.abs(yFor(q.actual!) - zeroY))}
                fill={actualColor}
                rx={1}
              />
            </g>
          );
        })}
      </svg>
      <div className="bar-chart-labels">
        <span>{usable[0].period.slice(0, 7)}</span>
        <span>{usable[usable.length - 1].period.slice(0, 7)}</span>
      </div>
      <div className="chart-legend">
        <span>
          <i className="legend-swatch estimate" /> Estimate
        </span>
        <span>
          <i className="legend-swatch beat" /> Beat
        </span>
        <span>
          <i className="legend-swatch miss" /> Miss
        </span>
      </div>
      {hovered && (
        <div className="chart-tooltip">
          {hovered.period}: est {hovered.estimate!.toFixed(2)}, actual {hovered.actual!.toFixed(2)}
          {beat ? " (beat)" : " (miss)"}
        </div>
      )}
    </div>
  );
}
