import { useMemo, useState } from "react";
import { displayName, groupOrder, useData } from "../lib/data";
import {
  exerciseSeries,
  groupWeeklyVolume,
  trackedExercises,
} from "../lib/stats";
import { formatDateShort, formatWeight } from "../lib/format";
import { LineChart, ColumnChart } from "../components/charts";
import ExercisePicker from "../components/ExercisePicker";
import GroupChips from "../components/GroupChips";
import EmptyState from "../components/EmptyState";
import { IconChevronDown, IconProgress } from "../components/Icons";

type Metric = "carga" | "volume";

export default function ProgressPage() {
  const { data } = useData();
  const [mode, setMode] = useState<"exercicio" | "grupo">("exercicio");
  const [metric, setMetric] = useState<Metric>("carga");
  const [pickerOpen, setPickerOpen] = useState(false);

  const tracked = useMemo(() => trackedExercises(data), [data]);
  const [selected, setSelected] = useState<{
    exerciseId: string;
    variation: string | null;
  } | null>(null);
  const current = selected ?? tracked[0] ?? null;

  const groups = groupOrder(data);
  const [group, setGroup] = useState<string | null>(null);
  const currentGroup = group ?? groups[0];

  const series = current
    ? exerciseSeries(data, current.exerciseId, current.variation)
    : [];
  const weekly = currentGroup ? groupWeeklyVolume(data, currentGroup, 8) : [];
  const hasWeekly = weekly.some((w) => w.volume > 0);

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
            text="Registre alguns treinos na aba Registros e volte pra ver a evolução de carga e volume."
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
                  className={`chip${metric === "carga" ? " active" : ""}`}
                  onClick={() => setMetric("carga")}
                >
                  Carga máxima
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
                  {metric === "carga" ? "Carga máxima (kg)" : "Volume (kg)"} —{" "}
                  {series.length}{" "}
                  {series.length === 1 ? "sessão" : "sessões"}
                </p>
                <LineChart
                  points={series.map((p) => ({
                    t: p.date.getTime(),
                    y: metric === "carga" ? p.maxWeight : p.volume,
                  }))}
                  formatValue={(y) =>
                    metric === "carga"
                      ? `Carga máx.: ${formatWeight(y)}`
                      : `Volume: ${formatWeight(y)}`
                  }
                  tooltipExtra={(i) =>
                    series[i].failures > 0
                      ? `${series[i].failures} série(s) até a falha`
                      : undefined
                  }
                />
                {series.length === 1 && (
                  <p className="muted" style={{ fontSize: 13, textAlign: "center" }}>
                    Registre mais sessões pra ver a linha de evolução.
                  </p>
                )}
              </div>

              <p className="section-title">Sessões</p>
              <div className="list">
                {[...series].reverse().map((p, i) => (
                  <div className="list-row" key={i}>
                    <div className="list-row-main">
                      <div className="list-row-title" style={{ fontSize: 15 }}>
                        {formatDateShort(p.date.toISOString())}
                      </div>
                      <div className="list-row-sub">
                        máx. {formatWeight(p.maxWeight)} · volume{" "}
                        {formatWeight(p.volume)}
                        {p.failures > 0 && ` · ${p.failures}F`}
                      </div>
                    </div>
                  </div>
                ))}
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
          <GroupChips
            groups={groups}
            value={currentGroup}
            onChange={(g) => setGroup(g ?? groups[0])}
            showAll={false}
          />
          <div className="card chart-card">
            <p className="chart-title">
              Volume semanal (kg) — {currentGroup} · últimas 8 semanas
            </p>
            {hasWeekly ? (
              <ColumnChart
                bars={weekly.map((w) => ({
                  label: w.weekStart.toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                  }),
                  y: w.volume,
                  sub: `${w.sets} ${w.sets === 1 ? "série" : "séries"}`,
                }))}
                formatValue={(y) => `Volume: ${formatWeight(y)}`}
              />
            ) : (
              <EmptyState
                title="Sem volume registrado"
                text={`Nenhuma série de ${currentGroup} nas últimas 8 semanas.`}
              />
            )}
          </div>
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
