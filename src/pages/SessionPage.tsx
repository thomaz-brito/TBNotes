import { useEffect, useReducer, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { displayName, useData } from "../lib/data";
import {
  formatClock,
  formatDateShort,
  formatWeight,
} from "../lib/format";
import ExercisePicker from "../components/ExercisePicker";
import Sheet from "../components/Sheet";
import {
  IconCheck,
  IconChevronLeft,
  IconMore,
  IconPlus,
  IconTimer,
  IconTrash,
} from "../components/Icons";
import type { Session, SessionSet } from "../lib/types";

function parseReps(value: string): number {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function parseWeight(value: string): number {
  const n = parseFloat(value.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function sessionVolume(session: Session): number {
  return session.exercises.reduce(
    (sum, ex) =>
      sum +
      ex.sets.reduce((s, set) => s + (set.done ? set.reps * set.weight : 0), 0),
    0,
  );
}

export default function SessionPage() {
  const { id } = useParams();
  const { data, updateSession, deleteSession } = useData();
  const navigate = useNavigate();
  const [picking, setPicking] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // cronômetro de descanso: guarda o instante em que o descanso termina
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  // "tick" força re-render a cada segundo (relógio da sessão + descanso)
  const [, tick] = useReducer((x: number) => x + 1, 0);

  const session = data.sessions.find((s) => s.id === id);
  const finished = Boolean(session?.finishedAt);

  useEffect(() => {
    if (finished) return;
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [finished]);

  const restRemaining = restEndsAt ? (restEndsAt - Date.now()) / 1000 : 0;
  useEffect(() => {
    if (restEndsAt && restRemaining <= 0) setRestEndsAt(null);
  });

  if (!session) return <Navigate to="/" replace />;

  const sessionId = session.id;
  const elapsed = session.finishedAt
    ? (new Date(session.finishedAt).getTime() -
        new Date(session.startedAt).getTime()) /
      1000
    : (Date.now() - new Date(session.startedAt).getTime()) / 1000;

  function patchSet(seId: string, setId: string, patch: Partial<SessionSet>) {
    updateSession(sessionId, (s) => ({
      ...s,
      exercises: s.exercises.map((ex) =>
        ex.id === seId
          ? {
              ...ex,
              sets: ex.sets.map((set) =>
                set.id === setId ? { ...set, ...patch } : set,
              ),
            }
          : ex,
      ),
    }));
  }

  function toggleDone(seId: string, setId: string) {
    const exercise = session!.exercises.find((ex) => ex.id === seId);
    const set = exercise?.sets.find((s) => s.id === setId);
    if (!exercise || !set) return;
    const nowDone = !set.done;
    patchSet(seId, setId, { done: nowDone });
    if (nowDone && !finished && exercise.restSeconds > 0) {
      setRestEndsAt(Date.now() + exercise.restSeconds * 1000);
    }
  }

  function addSet(seId: string) {
    updateSession(sessionId, (s) => ({
      ...s,
      exercises: s.exercises.map((ex) =>
        ex.id === seId
          ? {
              ...ex,
              sets: [
                ...ex.sets,
                {
                  id: crypto.randomUUID(),
                  reps: ex.sets[ex.sets.length - 1]?.reps ?? 10,
                  weight: ex.sets[ex.sets.length - 1]?.weight ?? 0,
                  done: false,
                },
              ],
            }
          : ex,
      ),
    }));
  }

  function removeExercise(seId: string) {
    updateSession(sessionId, (s) => ({
      ...s,
      exercises: s.exercises.filter((ex) => ex.id !== seId),
    }));
  }

  function isAdded(exerciseId: string, variation: string | null): boolean {
    return session!.exercises.some(
      (ex) => ex.exerciseId === exerciseId && ex.variation === variation,
    );
  }

  function toggleExercise(exerciseId: string, variation: string | null) {
    updateSession(sessionId, (s) => {
      const exists = s.exercises.some(
        (ex) => ex.exerciseId === exerciseId && ex.variation === variation,
      );
      if (exists) {
        return {
          ...s,
          exercises: s.exercises.filter(
            (ex) => !(ex.exerciseId === exerciseId && ex.variation === variation),
          ),
        };
      }
      return {
        ...s,
        exercises: [
          ...s.exercises,
          {
            id: crypto.randomUUID(),
            exerciseId,
            variation,
            restSeconds: 90,
            sets: [
              { id: crypto.randomUUID(), reps: 10, weight: 0, done: false },
              { id: crypto.randomUUID(), reps: 10, weight: 0, done: false },
              { id: crypto.randomUUID(), reps: 10, weight: 0, done: false },
            ],
          },
        ],
      };
    });
  }

  function finish() {
    const pending = session!.exercises.reduce(
      (sum, ex) => sum + ex.sets.filter((s) => !s.done).length,
      0,
    );
    const message =
      pending > 0
        ? `Ainda há ${pending} série(s) não concluída(s). Encerrar mesmo assim?`
        : "Concluir o treino?";
    if (!window.confirm(message)) return;
    setRestEndsAt(null);
    updateSession(sessionId, (s) => ({
      ...s,
      finishedAt: new Date().toISOString(),
    }));
    navigate("/historico");
  }

  function discard() {
    if (
      window.confirm(
        finished
          ? "Excluir este treino do histórico?"
          : "Descartar este treino? Nada será salvo.",
      )
    ) {
      deleteSession(sessionId);
      navigate(finished ? "/historico" : "/");
    }
  }

  const volume = sessionVolume(session);

  return (
    <div className="page">
      <header className="page-header" style={{ marginBottom: 4 }}>
        <button
          className="icon-btn"
          aria-label="Voltar"
          onClick={() => navigate(finished ? "/historico" : "/")}
        >
          <IconChevronLeft />
        </button>
        <div className="row-gap">
          <button
            className="icon-btn"
            aria-label="Opções"
            onClick={() => setMenuOpen(true)}
          >
            <IconMore />
          </button>
          <button
            className="icon-btn accent"
            aria-label="Adicionar exercício"
            onClick={() => setPicking(true)}
          >
            <IconPlus />
          </button>
        </div>
      </header>

      <h1 className="page-title" style={{ marginBottom: 2 }}>
        {session.routineName}
      </h1>
      <p className="page-subtitle" style={{ margin: "2px 0 16px" }}>
        {formatDateShort(session.startedAt)} ·{" "}
        {finished ? "concluído · " : ""}
        <span style={{ fontVariantNumeric: "tabular-nums" }}>
          {formatClock(elapsed)}
        </span>
        {volume > 0 && <> · {formatWeight(volume)}</>}
      </p>

      {session.exercises.map((ex) => (
        <div className="card" key={ex.id}>
          <div className="ex-card-head">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="list-row-title">
                {displayName(data, ex.exerciseId, ex.variation)}
              </div>
              <div className="list-row-sub">
                <IconTimer size={12} /> descanso {formatClock(ex.restSeconds)}
              </div>
            </div>
            <button
              className="icon-btn subtle"
              aria-label="Remover exercício"
              onClick={() => removeExercise(ex.id)}
            >
              <IconTrash size={20} />
            </button>
          </div>

          <div className="session-set-grid set-head">
            <span>#</span>
            <span>Reps</span>
            <span>Carga (kg)</span>
            <span>Feita</span>
          </div>
          {ex.sets.map((set, setIndex) => (
            <div className="session-set-grid" key={set.id}>
              <span className="set-index">{setIndex + 1}</span>
              <input
                className="num-input"
                inputMode="numeric"
                defaultValue={set.reps || ""}
                placeholder="0"
                onChange={(e) =>
                  patchSet(ex.id, set.id, { reps: parseReps(e.target.value) })
                }
              />
              <input
                className="num-input"
                inputMode="decimal"
                defaultValue={set.weight || ""}
                placeholder="0"
                onChange={(e) =>
                  patchSet(ex.id, set.id, {
                    weight: parseWeight(e.target.value),
                  })
                }
              />
              <button
                className={`set-done-btn${set.done ? " done" : ""}`}
                aria-label={set.done ? "Desmarcar série" : "Concluir série"}
                onClick={() => toggleDone(ex.id, set.id)}
              >
                <IconCheck size={22} />
              </button>
            </div>
          ))}
          <button className="btn btn-sm" onClick={() => addSet(ex.id)}>
            <IconPlus size={16} /> Série
          </button>
        </div>
      ))}

      {!finished && (
        <button className="btn btn-primary btn-block" onClick={finish}>
          Concluir treino
        </button>
      )}

      {/* cronômetro de descanso (espaço extra pra barra não cobrir o conteúdo) */}
      {restEndsAt && restRemaining > 0 && <div style={{ height: 76 }} />}
      {restEndsAt && restRemaining > 0 && (
        <div className="timer-bar">
          <IconTimer size={24} />
          <span className="time" style={{ flex: 1 }}>
            {formatClock(restRemaining)}
          </span>
          <button onClick={() => setRestEndsAt(restEndsAt + 15000)}>+15s</button>
          <button onClick={() => setRestEndsAt(null)}>Pular</button>
        </div>
      )}

      <ExercisePicker
        open={picking}
        onClose={() => setPicking(false)}
        isAdded={isAdded}
        onToggle={toggleExercise}
      />

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Opções">
        <button
          className="btn btn-danger btn-block"
          onClick={() => {
            setMenuOpen(false);
            discard();
          }}
        >
          <IconTrash size={20} />{" "}
          {finished ? "Excluir do histórico" : "Descartar treino"}
        </button>
      </Sheet>
    </div>
  );
}
