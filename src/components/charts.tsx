import { useEffect, useRef, useState } from "react";

// Gráficos em SVG puro, seguindo as specs de marcas:
// linha 2px, marcadores com anel na cor da superfície, área a 10% (só com
// uma série), grade em fio de cabelo, tooltip ao tocar (persiste no toque).
// Multi-séries: legenda obrigatória fica a cargo da página.

export const CHART_COLOR = "#059669"; // validado nos temas claro e escuro
// paleta categórica validada (claro e escuro): esmeralda, azul, âmbar, rosa
export const SERIES_COLORS = ["#059669", "#2563eb", "#d97706", "#db2777"];

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

export type LinePoint = { t: number; y: number };
export type LineSeries = { name?: string; color?: string; points: LinePoint[] };

type LineChartProps = {
  series: LineSeries[];
  formatValue: (y: number) => string;
  /** Texto extra no tooltip do ponto (série s, ponto i). */
  tooltipExtra?: (s: number, i: number) => string | undefined;
};

export function LineChart({ series, formatValue, tooltipExtra }: LineChartProps) {
  const [ref, width] = useContainerWidth();
  const [active, setActive] = useState<{ s: number; i: number } | null>(null);

  const all = series.flatMap((s) => s.points);
  if (all.length === 0) return null;

  const innerW = Math.max(width - M.left - M.right, 40);
  const innerH = HEIGHT - M.top - M.bottom;

  const ys = all.map((p) => p.y);
  const dataMin = Math.min(...ys);
  const dataMax = Math.max(...ys);
  const pad = (dataMax - dataMin) * 0.25 || dataMax * 0.1 || 1;
  const { lo, hi, ticks } = niceScale(Math.max(0, dataMin - pad), dataMax + pad);

  const t0 = Math.min(...all.map((p) => p.t));
  const t1 = Math.max(...all.map((p) => p.t));
  const xOf = (t: number) =>
    M.left + (t1 === t0 ? innerW / 2 : ((t - t0) / (t1 - t0)) * innerW);
  const yOf = (y: number) => M.top + innerH - ((y - lo) / (hi - lo)) * innerH;

  function pick(clientX: number, clientY: number, rect: DOMRect) {
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    let best: { s: number; i: number } | null = null;
    let bestDist = Infinity;
    series.forEach((sr, s) => {
      sr.points.forEach((p, i) => {
        const dx = xOf(p.t) - x;
        const dy = (yOf(p.y) - y) * 0.35; // prioriza proximidade horizontal
        const d = dx * dx + dy * dy;
        if (d < bestDist) {
          bestDist = d;
          best = { s, i };
        }
      });
    });
    setActive(best);
  }

  const activePoint = active ? series[active.s]?.points[active.i] : null;
  const activeColor = active
    ? series[active.s]?.color ?? CHART_COLOR
    : CHART_COLOR;

  // rótulos do eixo x: 3-4 datas espalhadas pelo domínio
  const xLabels =
    t1 === t0
      ? [t0]
      : [t0, t0 + (t1 - t0) / 3, t0 + ((t1 - t0) * 2) / 3, t1];

  return (
    <div className="chart-wrap" ref={ref}>
      {width > 0 && (
        <>
          <svg
            width={width}
            height={HEIGHT}
            onPointerDown={(e) =>
              pick(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect())
            }
            onPointerMove={(e) => {
              if (e.buttons > 0 || e.pointerType === "mouse")
                pick(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect());
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

            {series.map((sr, s) => {
              if (sr.points.length === 0) return null;
              const color = sr.color ?? CHART_COLOR;
              const path = sr.points
                .map(
                  (p, i) =>
                    `${i === 0 ? "M" : "L"}${xOf(p.t).toFixed(1)},${yOf(p.y).toFixed(1)}`,
                )
                .join(" ");
              return (
                <g key={s}>
                  {series.length === 1 && (
                    <path
                      d={`${path} L${xOf(sr.points[sr.points.length - 1].t).toFixed(1)},${
                        M.top + innerH
                      } L${xOf(sr.points[0].t).toFixed(1)},${M.top + innerH} Z`}
                      fill={color}
                      opacity={0.1}
                    />
                  )}
                  <path
                    d={path}
                    fill="none"
                    stroke={color}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {sr.points.map((p, i) => (
                    <circle
                      key={i}
                      cx={xOf(p.t)}
                      cy={yOf(p.y)}
                      r={active?.s === s && active?.i === i ? 5.5 : 4}
                      fill={color}
                      className="chart-dot"
                    />
                  ))}
                </g>
              );
            })}

            {activePoint && (
              <line
                x1={xOf(activePoint.t)}
                x2={xOf(activePoint.t)}
                y1={M.top}
                y2={M.top + innerH}
                className="chart-crosshair"
              />
            )}

            {xLabels.map((t, i) => (
              <text
                key={i}
                x={xOf(t)}
                y={HEIGHT - 6}
                className="chart-tick"
                textAnchor={i === 0 ? "start" : i === xLabels.length - 1 ? "end" : "middle"}
              >
                {formatShortDate(t)}
              </text>
            ))}
          </svg>

          {activePoint && active && (
            <div
              className="chart-tooltip"
              style={{ left: Math.min(Math.max(xOf(activePoint.t), 80), width - 80) }}
            >
              <div className="chart-tooltip-title">
                {series[active.s].name ? `${series[active.s].name} · ` : ""}
                {formatShortDate(activePoint.t)}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {series.length > 1 && (
                  <span className="dot" style={{ background: activeColor }} />
                )}
                {formatValue(activePoint.y)}
              </div>
              {tooltipExtra?.(active.s, active.i) && (
                <div className="muted" style={{ fontSize: 12 }}>
                  {tooltipExtra(active.s, active.i)}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export type ScatterPoint = { x: number; y: number; t: number };

type ScatterChartProps = {
  points: ScatterPoint[];
  formatTooltip: (p: ScatterPoint) => string;
};

/** Dispersão carga × repetições; pontos recentes vivos, antigos apagados. */
export function ScatterChart({ points, formatTooltip }: ScatterChartProps) {
  const [ref, width] = useContainerWidth();
  const [active, setActive] = useState<number | null>(null);

  if (points.length === 0) return null;

  const innerW = Math.max(width - M.left - M.right, 40);
  const innerH = HEIGHT - M.top - M.bottom;

  const xs = points.map((p) => p.x);
  const ysAll = points.map((p) => p.y);
  const xPad = (Math.max(...xs) - Math.min(...xs)) * 0.15 || Math.max(...xs) * 0.08 || 1;
  const xScale = niceScale(Math.max(0, Math.min(...xs) - xPad), Math.max(...xs) + xPad);
  const yScale = {
    lo: Math.max(0, Math.min(...ysAll) - 2),
    hi: Math.max(...ysAll) + 2,
  };
  const yTicks = niceScale(yScale.lo, yScale.hi).ticks.filter(
    (v) => Number.isInteger(v) && v >= yScale.lo && v <= yScale.hi,
  );

  const xOf = (x: number) =>
    M.left + ((x - xScale.lo) / (xScale.hi - xScale.lo)) * innerW;
  const yOf = (y: number) =>
    M.top + innerH - ((y - yScale.lo) / (yScale.hi - yScale.lo)) * innerH;

  const t0 = Math.min(...points.map((p) => p.t));
  const t1 = Math.max(...points.map((p) => p.t));
  const recency = (t: number) => (t1 === t0 ? 1 : (t - t0) / (t1 - t0));

  const ordered = [...points].sort((a, b) => a.t - b.t); // recentes por cima

  function pick(clientX: number, clientY: number, rect: DOMRect) {
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    let best = 0;
    let bestDist = Infinity;
    ordered.forEach((p, i) => {
      const d = (xOf(p.x) - x) ** 2 + (yOf(p.y) - y) ** 2;
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setActive(best);
  }

  const activePoint = active !== null ? ordered[active] : null;

  return (
    <div className="chart-wrap" ref={ref}>
      {width > 0 && (
        <>
          <svg
            width={width}
            height={HEIGHT}
            onPointerDown={(e) =>
              pick(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect())
            }
            onPointerLeave={(e) => {
              if (e.pointerType === "mouse") setActive(null);
            }}
          >
            {yTicks.map((v) => (
              <g key={`y${v}`}>
                <line
                  x1={M.left}
                  x2={width - M.right}
                  y1={yOf(v)}
                  y2={yOf(v)}
                  className="chart-grid"
                />
                <text x={M.left - 8} y={yOf(v) + 3.5} className="chart-tick" textAnchor="end">
                  {v}
                </text>
              </g>
            ))}
            {xScale.ticks.map((v) => (
              <text
                key={`x${v}`}
                x={xOf(v)}
                y={HEIGHT - 6}
                className="chart-tick"
                textAnchor="middle"
              >
                {v.toLocaleString("pt-BR")}
              </text>
            ))}
            {ordered.map((p, i) => (
              <circle
                key={i}
                cx={xOf(p.x)}
                cy={yOf(p.y)}
                r={active === i ? 6.5 : 5}
                fill={CHART_COLOR}
                opacity={0.25 + 0.75 * recency(p.t)}
                className="chart-dot"
              />
            ))}
          </svg>
          {activePoint && (
            <div
              className="chart-tooltip"
              style={{
                left: Math.min(Math.max(xOf(activePoint.x), 80), width - 80),
              }}
            >
              <div className="chart-tooltip-title">{formatShortDate(activePoint.t)}</div>
              <div>{formatTooltip(activePoint)}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
