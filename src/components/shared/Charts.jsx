// Lightweight dependency-free SVG charts for the earnings view.

// Vertical bar chart. data: [{ label, value }]
export function BarChart({ data, format = (v) => v }) {
  const W = 360;
  const H = 170;
  const padX = 8;
  const padTop = 22;
  const padBottom = 26;
  const max = Math.max(...data.map((d) => d.value), 1);
  const n = data.length;
  const slot = (W - padX * 2) / n;
  const bw = Math.min(34, slot * 0.6);
  const chartH = H - padTop - padBottom;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Earnings by month">
      {/* baseline */}
      <line x1={padX} y1={H - padBottom} x2={W - padX} y2={H - padBottom} className="chart-axis" />
      {data.map((d, i) => {
        const h = (d.value / max) * chartH;
        const x = padX + slot * i + (slot - bw) / 2;
        const y = H - padBottom - h;
        return (
          <g key={d.label}>
            <rect x={x} y={y} width={bw} height={Math.max(h, 2)} rx="4" className="chart-bar" />
            {d.value > 0 && (
              <text x={x + bw / 2} y={y - 6} className="chart-val" textAnchor="middle">
                {format(d.value)}
              </text>
            )}
            <text x={x + bw / 2} y={H - padBottom + 16} className="chart-lbl" textAnchor="middle">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// Donut showing two slices (released vs pending).
export function Donut({ released, pending }) {
  const total = released + pending || 1;
  const r = 52;
  const c = 2 * Math.PI * r;
  const relLen = (released / total) * c;
  return (
    <svg viewBox="0 0 140 140" className="donut" role="img" aria-label="Released vs pending">
      <circle cx="70" cy="70" r={r} className="donut-track" />
      <circle
        cx="70"
        cy="70"
        r={r}
        className="donut-rel"
        strokeDasharray={`${relLen} ${c - relLen}`}
        transform="rotate(-90 70 70)"
      />
      <text x="70" y="66" textAnchor="middle" className="donut-pct">
        {Math.round((released / total) * 100)}%
      </text>
      <text x="70" y="86" textAnchor="middle" className="donut-cap">
        released
      </text>
    </svg>
  );
}
