import { useMemo, useState } from "react";
import { displayName, groupOrder, useData } from "../lib/data";
import {
  exerciseSeries,
  groupStrengthIndex,
  trackedExercises,
} from "../lib/stats";
import { formatDateShort, formatReps, formatWeight } from "../lib/format";
import { LineChart, ScatterChart, SERIES_COLORS } from "../components/charts";
import ExercisePicker from "../components/ExercisePicker";
import EmptyState from "../components/EmptyState";
import {
  IconChevronDown,
  IconChevronRight,
  IconProgress,
} from "../components/Icons";

type Metric = "e1rm" | "volume";
const MAX_GROUPS = SERIES_COLORS.length; // 4 linhas sobrepostas no máximo

export default function ProgressPage() {
  const { data } = useData();
  const [mode, setMode] = useState<"exercicio" | "grupo">("exercicio");
  const [metric, setMetric] = useState<Metric>("e1rm");
  const [pickerOpen, setPickerOpen] = useState(false);
  // seções secundárias recolhidas por padrão
  const [showScatter, setShowScatter] = useState(false);
  const [showSessions, setShowSessions] = useState(false);

  const tracked = useMemo(() => trackedExercises(data), [data]);
  const [selected, setSelected] = useState<{
    exerciseId: string;
    variation: string | null;
  } | null>(null);
  const current = selected ?? tracked[0] ?? null;

  const groups = groupOrder(data);
  const indexByGroup = useMemo(() => {
    const map = new Map<string, ReturnType<typeof groupStrengthIndex>>();
    for (const g of groups) {
      const points = groupStrengthIndex(data, g);
      if (points.length > 0) map.set(g, points);
    }
    return map;
  }, [data, groups]);
  const groupsWithData = groups.filter((g) => (indexByGroup.get(g)?.length ?? 0) > 1);

  // seleção de grupos: cada grupo mantém sua cor enquanto estiver selecionado
  const [groupColors, setGroupColors] = useState<Record<string, number> | null>(null);
  const activeGroupColors =
    groupColors ??
    Object.fromEntries(groupsWithData.slice(0, 2).map((g, i) => [g, i]));

  function toggleGroup(group: string) {
    const next = { ...activeGroupColors };
    if (group in next) {
      delete next[group];
    } else {
      if (Object.keys(next).length >= MAX_GROUPS) {
        window.alert(`Compare até ${MAX_GROUPS} grupos por vez.`);
        return;
      }
      const used = new Set(Object.values(next));
      next[group] = [0, 1, 2, 3].find((i) => !used.has(i)) ?? 0;
    }
    setGroupColors(next);
  }

  const series = current
    ? exerciseSeries(data, current.exerciseId, current.variation)
    : [];
  const e1rmPoints = series.filter((p) => p.e1rm > 0);

  if (data.sessions.length === 0) {
    return (
      <div className="page">
        <header className="page-header">
          <h1 className="page-title">Progresso</h1>
        </header>
        <div className="card">
          <EmptyState
            icon={<IconProgress size={40} />}
            title="Seus gráficos vão aparecer aqui"
            text="Registre alguns treinos na aba Registros e volte pra ver a evolução."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Progresso</h1>
      </header>

      <div className="chips" style={{ paddingTop: 0 }}>
        <button
          className={`chip${mode === "exercicio" ? " active" : ""}`}
          onClick={() => setMode("exercicio")}
        >
          Por exercício
        </button>
        <button
          className={`chip${mode === "grupo" ? " active" : ""}`}
          onClick={() => setMode("grupo")}
        >
          Por grupo muscular
        </button>
      </div>

      {mode === "exercicio" && (
        <>
          <button className="selector-btn" onClick={() => setPickerOpen(true)}>
            <span className="selector-label">
              {current
                ? displayName(data, current.exerciseId, current.variation)
                : "Escolher exercício"}
            </span>
            <IconChevronDown size={20} />
          </button>

          {current && series.length > 0 ? (
            <>
              <div className="chips" style={{ paddingTop: 0 }}>
                <button
                  className={`chip${metric === "e1rm" ? " active" : ""}`}
                  onClick={() => setMetric("e1rm")}
                >
                  1RM estimada
                </button>
                <button
                  className={`chip${metric === "volume" ? " active" : ""}`}
                  onClick={() => setMetric("volume")}
                >
                  Volume
                </button>
              </div>

              <div className="card chart-card">
                <p className="chart-title">
                  {metric === "e1rm"
                    ? "1RM estimada (kg) — média das séries do dia"
                    : "Volume (kg) por sessão"}
                </p>
                <LineChart
                  series={[
                    {
                      points: (metric === "e1rm" ? e1rmPoints : series).map((p) => ({
                        t: p.date.getTime(),
                        y: metric === "e1rm" ? p.e1rm : p.volume,
                      })),
                    },
                  ]}
                  formatValue={(y) =>
                    metric === "e1rm"
                      ? `e1RM ${formatWeight(Math.round(y * 10) / 10)}`
                      : `Volume ${formatWeight(y)}`
                  }
                  tooltipExtra={(_s, i) => {
                    const p = (metric === "e1rm" ? e1rmPoints : series)[i];
                    return p.validSets > 0
                      ? `média de ${p.validSets} ${
                          p.validSets === 1 ? "série" : "séries"
                        }: ${formatReps(p.avgReps)} × ${formatWeight(p.avgWeight)}`
                      : undefined;
                  }}
                />
                {metric === "e1rm" && (
                  <p className="chart-note">
                    Média das e1RMs das séries do dia (Epley), considerando
                    séries de 1 a 12 reps. Ganhos de consistência contam.
                  </p>
                )}
              </div>

              {e1rmPoints.length > 1 && (
                <div className="card chart-card">
                  <button
                    className="collapse-head"
                    onClick={() => setShowScatter(!showScatter)}
                  >
                    <span className="chart-title" style={{ margin: 0 }}>
                      Carga (kg) × repetições
                    </span>
                    {showScatter ? (
                      <IconChevronDown size={20} />
                    ) : (
                      <IconChevronRight size={20} />
                    )}
                  </button>
                  {showScatter && (
                    <>
                      <ScatterChart
                        points={e1rmPoints.map((p) => ({
                          x: p.avgWeight,
                          y: p.avgReps,
                          t: p.date.getTime(),
                        }))}
                        formatTooltip={(p) =>
                          `${formatReps(p.y)} reps × ${formatWeight(p.x)}`
                        }
                      />
                      <p className="chart-note">
                        Cada ponto é a média das séries de uma sessão; recente é
                        mais vivo. Progresso empurra a nuvem pra cima e pra
                        direita.
                      </p>
                    </>
                  )}
                </div>
              )}

              <div className="card chart-card">
                <button
                  className="collapse-head"
                  onClick={() => setShowSessions(!showSessions)}
                >
                  <span className="chart-title" style={{ margin: 0 }}>
                    Sessões ({series.length})
                  </span>
                  {showSessions ? (
                    <IconChevronDown size={20} />
                  ) : (
                    <IconChevronRight size={20} />
                  )}
                </button>
                {showSessions && (
                  <div className="list" style={{ marginTop: 8 }}>
                    {[...series].reverse().map((p, i) => (
                      <div className="list-row" key={i}>
                        <div className="list-row-main">
                          <div className="list-row-title" style={{ fontSize: 15 }}>
                            {formatDateShort(p.date.toISOString())}
                          </div>
                          <div className="list-row-sub">
                            {p.e1rm > 0 && (
                              <>e1RM {formatWeight(Math.round(p.e1rm * 10) / 10)} · </>
                            )}
                            {p.validSets > 0 && (
                              <>
                                {p.validSets}×{" "}
                                {formatReps(p.avgReps)} × {formatWeight(p.avgWeight)} ·{" "}
                              </>
                            )}
                            vol. {formatWeight(p.volume)}
                            {p.failures > 0 && ` · ${p.failures}F`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="card">
              <EmptyState
                icon={<IconProgress size={36} />}
                title="Sem registros deste exercício"
                text="Conclua séries dele em algum treino pra começar a acompanhar."
              />
            </div>
          )}
        </>
      )}

      {mode === "grupo" && (
        <>
          <div className="chips">
            {groups.map((g) => {
              const hasData = (indexByGroup.get(g)?.length ?? 0) > 0;
              const selected = g in activeGroupColors;
              return (
                <button
                  key={g}
                  className={`chip${selected ? " active" : ""}`}
                  style={{
                    opacity: hasData ? 1 : 0.45,
                    ...(selected
                      ? {
                          borderColor: SERIES_COLORS[activeGroupColors[g]],
                          color: SERIES_COLORS[activeGroupColors[g]],
                          background: "transparent",
                        }
                      : {}),
                  }}
                  disabled={!hasData}
                  onClick={() => toggleGroup(g)}
                >
                  {g}
                </button>
              );
            })}
          </div>

          {Object.keys(activeGroupColors).length === 0 ? (
            <div className="card">
              <EmptyState
                title="Selecione grupos pra comparar"
                text="Toque nos grupos acima pra sobrepor as linhas de evolução."
              />
            </div>
          ) : (
            <div className="card chart-card">
              <p className="chart-title">
                Índice de força (%) — primeira sessão de cada exercício = 100
              </p>
              {Object.keys(activeGroupColors).length > 1 && (
                <div className="chart-legend">
                  {Object.entries(activeGroupColors).map(([g, c]) => (
                    <span key={g} className="chart-legend-item">
                      <span className="dot" style={{ background: SERIES_COLORS[c] }} />
                      {g}
                    </span>
                  ))}
                </div>
              )}
              <LineChart
                series={Object.entries(activeGroupColors).map(([g, c]) => ({
                  name: g,
                  color: SERIES_COLORS[c],
                  points: indexByGroup.get(g) ?? [],
                }))}
                formatValue={(y) => `${(Math.round(y * 10) / 10).toLocaleString("pt-BR")}%`}
              />
              <p className="chart-note">
                Cada exercício conta pelo quanto evoluiu, não pelo quanto se
                levanta nele. Um exercício novo entra valendo o índice atual do
                grupo, então não derruba a linha ao estrear.
              </p>
            </div>
          )}
        </>
      )}

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        isAdded={(id, variation) =>
          current?.exerciseId === id && current?.variation === variation
        }
        onToggle={(id, variation) => {
          setSelected({ exerciseId: id, variation });
          setPickerOpen(false);
        }}
      />
    </div>
  );
}
