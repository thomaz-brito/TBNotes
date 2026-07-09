import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { activeSession, useData } from "../lib/data";
import { formatDateShort, formatTimeOfDay, todayLabel } from "../lib/format";
import Sheet from "../components/Sheet";
import EmptyState from "../components/EmptyState";
import {
  IconChevronRight,
  IconCopy,
  IconRoutines,
  IconToday,
} from "../components/Icons";

export default function TodayPage() {
  const { data, startSession, deleteSession } = useData();
  const navigate = useNavigate();
  const [pickedRoutine, setPickedRoutine] = useState<string | null>(null);

  const current = activeSession(data);
  const routine = data.routines.find((r) => r.id === pickedRoutine);
  const lastOfRoutine = pickedRoutine
    ? [...data.sessions]
        .filter((s) => s.routineId === pickedRoutine && s.finishedAt)
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0]
    : undefined;

  function start(mode: "padrao" | "ultima") {
    if (!pickedRoutine) return;
    if (current) {
      const discard = window.confirm(
        `Você já tem um treino em andamento ("${current.routineName}"). Descartá-lo e começar outro?`,
      );
      if (!discard) return;
      deleteSession(current.id);
    }
    const session = startSession(pickedRoutine, mode);
    setPickedRoutine(null);
    if (session) navigate(`/sessao/${session.id}`);
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Hoje</h1>
      </header>
      <p className="page-subtitle">{todayLabel()}</p>

      {current && (
        <button
          className="card card-tap"
          style={{ borderColor: "var(--accent)" }}
          onClick={() => navigate(`/sessao/${current.id}`)}
        >
          <div className="row-gap">
            <div style={{ flex: 1 }}>
              <div className="list-row-sub" style={{ color: "var(--accent)" }}>
                Treino em andamento · começou às {formatTimeOfDay(current.startedAt)}
              </div>
              <div className="list-row-title" style={{ fontSize: 18 }}>
                {current.routineName}
              </div>
            </div>
            <span className="chevron">
              <IconChevronRight size={22} />
            </span>
          </div>
        </button>
      )}

      {data.routines.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<IconToday size={40} />}
            title="Comece montando seus treinos"
            text="Crie seus treinos na aba Treinos. Depois, é aqui que você inicia a sessão do dia com tudo já preenchido."
          >
            <Link
              to="/treinos"
              className="btn btn-primary"
              style={{ marginTop: 16, textDecoration: "none" }}
            >
              Criar meu primeiro treino
            </Link>
          </EmptyState>
        </div>
      ) : (
        <>
          <p className="section-title">Iniciar treino</p>
          <div className="list">
            {data.routines.map((r) => (
              <button
                key={r.id}
                className="list-row"
                onClick={() => {
                  if (r.exercises.length === 0) {
                    window.alert(
                      "Este treino ainda não tem exercícios. Adicione na aba Treinos.",
                    );
                    return;
                  }
                  setPickedRoutine(r.id);
                }}
              >
                <IconRoutines size={22} />
                <div className="list-row-main">
                  <div className="list-row-title">{r.name}</div>
                  <div className="list-row-sub">
                    {r.exercises.length}{" "}
                    {r.exercises.length === 1 ? "exercício" : "exercícios"}
                  </div>
                </div>
                <span className="chevron">
                  <IconChevronRight size={20} />
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      <Sheet
        open={pickedRoutine !== null}
        onClose={() => setPickedRoutine(null)}
        title={routine?.name}
      >
        <button className="btn btn-primary btn-block" onClick={() => start("padrao")}>
          <IconRoutines size={20} /> Começar pelo treino padrão
        </button>
        {lastOfRoutine && (
          <button
            className="btn btn-block"
            style={{ marginTop: 10 }}
            onClick={() => start("ultima")}
          >
            <IconCopy size={20} /> Copiar última sessão (
            {formatDateShort(lastOfRoutine.startedAt)})
          </button>
        )}
        <p className="muted" style={{ fontSize: 13, textAlign: "center", marginTop: 14 }}>
          {lastOfRoutine
            ? "Copiar a última sessão traz as cargas e reps que você fez da última vez."
            : "Quando você concluir uma sessão deste treino, poderá copiá-la aqui."}
        </p>
      </Sheet>
    </div>
  );
}
