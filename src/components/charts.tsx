import { useEffect, useRef, useState } from "react";

// Gráficos em SVG puro, seguindo as specs de marcas:
// linha 2px, marcadores ≥8px com anel na cor da superfície, área a 10%,
// grade em fio de cabelo, colunas ≤24px com topo arredondado de 4px,
// tooltip ao tocar/arrastar (série única: sem legenda — o título nomeia).

const CHART_COLOR = "#059669"; // validado nos temas claro e escuro

function useContainerWidth(): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setWidth(el.clientWidth));
    observer.observe(el);
    setWidth(el.clientWidth);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

/** Escala "bonita": ticks redondos (passos 1/2/5 × 10^k) cobrindo [min, max]. */
function niceScale(min: number, max: number): { lo: number; hi: number; ticks: number[] } {
  if (max <= min) max = min + 1;
  const span = max - min;
  const rawStep = span / 3;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const step =
    [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= 4) ?? 10 * mag;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
  return { lo, hi, ticks };
}

function formatShortDate(ms: number): string {
  return new Date(ms).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

const M = { top: 12, right: 14, bottom: 24, left: 40 };
const HEIGHT = 220;

type LinePoint = { t: number; y: number };

type LineChartProps = {
  points: LinePoint[];
  formatValue: (y: number) => string;
  tooltipExtra?: (index: number) => string | undefined;
};

export function LineChart({ points, formatValue, tooltipExtra }: LineChartProps) {
  const [ref, width] = useContainerWidth();
  const [active, setActive] = useState<number | null>(null);

  if (points.length === 0) return null;

  const innerW = Math.max(width - M.left - M.right, 40);
  const innerH = HEIGHT - M.top - M.bottom;

  const ys = points.map((p) => p.y);
  const dataMin = Math.min(...ys);
  const dataMax = Math.max(...ys);
  const pad = (dataMax - dataMin) * 0.25 || dataMax * 0.1 || 1;
  const { lo, hi, ticks } = niceScale(Math.max(0, dataMin - pad), dataMax + pad);

  const t0 = points[0].t;
  const t1 = points[points.length - 1].t;
  const xOf = (t: number) =>
    M.left + (t1 === t0 ? innerW / 2 : ((t - t0) / (t1 - t0)) * innerW);
  const yOf = (y: number) => M.top + innerH - ((y - lo) / (hi - lo)) * innerH;

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${xOf(p.t).toFixed(1)},${yOf(p.y).toFixed(1)}`)
    .join(" ");
  const areaPath =
    `${path} L${xOf(t1).toFixed(1)},${M.top + innerH} L${xOf(t0).toFixed(1)},${
      M.top + innerH
    } Z`;

  // rótulos do eixo x: primeiro, último e até 2 intermediários
  const xLabelIdx = new Set<number>([0, points.length - 1]);
  if (points.length > 3) {
    xLabelIdx.add(Math.round((points.length - 1) / 3));
    xLabelIdx.add(Math.round(((points.length - 1) * 2) / 3));
  }

  function pick(clientX: number, rect: DOMRect) {
    const x = clientX - rect.left;
    let best = 0;
    let bestDist = Infinity;
    points.forEach((p, i) => {
      const d = Math.abs(xOf(p.t) - x);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setActive(best);
  }

  const activePoint = active !== null ? points[active] : null;

  return (
    <div className="chart-wrap" ref={ref}>
      {width > 0 && (
        <>
          <svg
            width={width}
            height={HEIGHT}
            onPointerDown={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
            onPointerMove={(e) => {
              if (e.buttons > 0 || e.pointerType === "mouse")
                pick(e.clientX, e.currentTarget.getBoundingClientRect());
            }}
            onPointerLeave={(e) => {
              // no toque, o "leave" dispara ao levantar o dedo — mantém o tooltip
              if (e.pointerType === "mouse") setActive(null);
            }}
          >
            {ticks.map((v) => (
              <g key={v}>
                <line
                  x1={M.left}
                  x2={width - M.right}
                  y1={yOf(v)}
                  y2={yOf(v)}
                  className="chart-grid"
                />
                <text x={M.left - 8} y={yOf(v) + 3.5} className="chart-tick" textAnchor="end">
                  {v.toLocaleString("pt-BR")}
                </text>
              </g>
            ))}
            <path d={areaPath} fill={CHART_COLOR} opacity={0.1} />
            <path
              d={path}
              fill="none"
              stroke={CHART_COLOR}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {activePoint && (
              <line
                x1={xOf(activePoint.t)}
                x2={xOf(activePoint.t)}
                y1={M.top}
                y2={M.top + innerH}
                className="chart-crosshair"
              />
            )}
            {points.map((p, i) => (
              <circle
                key={i}
                cx={xOf(p.t)}
                cy={yOf(p.y)}
                r={active === i ? 5.5 : 4}
                fill={CHART_COLOR}
                className="chart-dot"
              />
            ))}
            {points.map(
              (p, i) =>
                xLabelIdx.has(i) && (
                  <text
                    key={`x${i}`}
                    x={xOf(p.t)}
                    y={HEIGHT - 6}
                    className="chart-tick"
                    textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
                  >
                    {formatShortDate(p.t)}
                  </text>
                ),
            )}
          </svg>
          {activePoint && (
            <div
              className="chart-tooltip"
              style={{
                left: Math.min(Math.max(xOf(activePoint.t), 70), width - 70),
              }}
            >
              <div className="chart-tooltip-title">{formatShortDate(activePoint.t)}</div>
              <div>{formatValue(activePoint.y)}</div>
              {tooltipExtra?.(active!) && (
                <div className="muted" style={{ fontSize: 12 }}>
                  {tooltipExtra(active!)}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

type ColumnPoint = { label: string; y: number; sub?: string };

type ColumnChartProps = {
  bars: ColumnPoint[];
  formatValue: (y: number) => string;
};

export function ColumnChart({ bars, formatValue }: ColumnChartProps) {
  const [ref, width] = useContainerWidth();
  const [active, setActive] = useState<number | null>(null);

  if (bars.length === 0) return null;

  const innerW = Math.max(width - M.left - M.right, 40);
  const innerH = HEIGHT - M.top - M.bottom;
  const { lo, hi, ticks } = niceScale(0, Math.max(...bars.map((b) => b.y), 1));
  const yOf = (y: number) => M.top + innerH - ((y - lo) / (hi - lo)) * innerH;

  const step = innerW / bars.length;
  const barW = Math.min(24, step * 0.6);

  const activeBar = active !== null ? bars[active] : null;
  const xCenter = (i: number) => M.left + step * i + step / 2;

  function roundedColumn(i: number, y: number): string {
    const x = xCenter(i) - barW / 2;
    const top = yOf(y);
    const base = M.top + innerH;
    const r = Math.min(4, barW / 2, Math.max(base - top, 0));
    if (base - top < 1) return "";
    return `M${x},${base} V${top + r} Q${x},${top} ${x + r},${top} H${
      x + barW - r
    } Q${x + barW},${top} ${x + barW},${top + r} V${base} Z`;
  }

  return (
    <div className="chart-wrap" ref={ref}>
      {width > 0 && (
        <>
          <svg
            width={width}
            height={HEIGHT}
            onPointerDown={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const i = Math.floor((e.clientX - rect.left - M.left) / step);
              setActive(i >= 0 && i < bars.length ? i : null);
            }}
            onPointerLeave={(e) => {
              if (e.pointerType === "mouse") setActive(null);
            }}
          >
            {ticks.map((v) => (
              <g key={v}>
                <line
                  x1={M.left}
                  x2={width - M.right}
                  y1={yOf(v)}
                  y2={yOf(v)}
                  className="chart-grid"
                />
                <text x={M.left - 8} y={yOf(v) + 3.5} className="chart-tick" textAnchor="end">
                  {v.toLocaleString("pt-BR")}
                </text>
              </g>
            ))}
            {bars.map((b, i) => (
              <path
                key={i}
                d={roundedColumn(i, b.y)}
                fill={CHART_COLOR}
                opacity={active === null || active === i ? 1 : 0.45}
              />
            ))}
            {bars.map((b, i) => (
              <text
                key={`x${i}`}
                x={xCenter(i)}
                y={HEIGHT - 6}
                className="chart-tick"
                textAnchor="middle"
              >
                {b.label}
              </text>
            ))}
          </svg>
          {activeBar && (
            <div
              className="chart-tooltip"
              style={{ left: Math.min(Math.max(xCenter(active!), 70), width - 70) }}
            >
              <div className="chart-tooltip-title">
                Semana de {activeBar.label}
              </div>
              <div>{formatValue(activeBar.y)}</div>
              {activeBar.sub && (
                <div className="muted" style={{ fontSize: 12 }}>
                  {activeBar.sub}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
