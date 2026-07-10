import { useEffect, useReducer, useState } from "react";
import { displayName, useData, variationNotes } from "../lib/data";
import {
  dateKeyOfISO,
  formatClock,
  formatTimeOfDay,
  formatWeight,
  todayKey,
} from "../lib/format";
import ExercisePicker from "./ExercisePicker";
import Sheet from "./Sheet";
import {
  IconCheck,
  IconClose,
  IconInfo,
  IconMore,
  IconPlay,
  IconPlus,
  IconTrash,
} from "./Icons";
import type { Session, SessionSet } from "../lib/types";

// Cartão completo de uma sessão de treino: exercícios, séries, reps, carga,
// marcador de falha e série feita. É a mesma interface durante o treino
// e na consulta/edição de dias passados.
// - O tique de "feita" e o cronômetro de descanso só existem no dia de hoje.
// - O cronômetro é manual: fica embutido no rodapé de cada exercício (▶).

function parseReps(value: string): number {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function parseWeight(value: string): number {
  const n = parseFloat(value.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function sessionVolume(session: Session): number {
  return session.exercises.reduce(
    (sum, ex) => sum + ex.sets.reduce((s, set) => s + set.reps * set.weight, 0),
    0,
  );
}

export default function SessionCard({ session }: { session: Session }) {
  const { data, updateSession, deleteSession } = useData();
  const [picking, setPicking] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notesFor, setNotesFor] = useState<string | null>(null);

  // cronômetro de descanso manual: um por vez, preso ao exercício onde foi iniciado
  const [timer, setTimer] = useState<{ exId: string; endsAt: number } | null>(
    null,
  );
  const [, tick] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    if (!timer) return;
    const interval = setInterval(tick, 400);
    return () => clearInterval(interval);
  }, [timer]);
  const timerRemaining = timer ? (timer.endsAt - Date.now()) / 1000 : 0;
  useEffect(() => {
    if (timer && timerRemaining <= 0) setTimer(null);
  });

  const sessionId = session.id;
  const isToday = dateKeyOfISO(session.startedAt) === todayKey();
  const volume = sessionVolume(session);
  const totalSets = session.exercises.reduce(
    (sum, ex) => sum + ex.sets.length,
    0,
  );

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
                  failure: false,
                },
              ],
            }
          : ex,
      ),
    }));
  }

  function removeSet(seId: string, setId: string) {
    updateSession(sessionId, (s) => ({
      ...s,
      exercises: s.exercises.map((ex) =>
        ex.id === seId
          ? { ...ex, sets: ex.sets.filter((set) => set.id !== setId) }
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
    return session.exercises.some(
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
            sets: Array.from({ length: 3 }, () => ({
              id: crypto.randomUUID(),
              reps: 10,
              weight: 0,
              done: false,
              failure: false,
            })),
          },
        ],
      };
    });
  }

  function remove() {
    if (window.confirm(`Excluir o treino "${session.routineName}" deste dia?`)) {
      deleteSession(sessionId);
    }
    setMenuOpen(false);
  }

  const gridClass = isToday ? "session-set-grid" : "session-set-grid no-done";

  return (
    <div className="session-block">
      <div className="session-head">
        <div style={{ flex: 1, minWidth: 0 }}>
          <input
            className="session-name-input"
            value={session.routineName}
            aria-label="Nome do treino"
            onChange={(e) =>
              updateSession(sessionId, (s) => ({
                ...s,
                routineName: e.target.value,
              }))
            }
          />
          <div className="list-row-sub">
            {formatTimeOfDay(session.startedAt)}
            {totalSets > 0 && (
              <> · {totalSets} {totalSets === 1 ? "série" : "séries"}</>
            )}
            {volume > 0 && <> · {formatWeight(volume)}</>}
          </div>
        </div>
        <button
          className="icon-btn subtle"
          aria-label="Opções do treino"
          onClick={() => setMenuOpen(true)}
        >
          <IconMore size={22} />
        </button>
        <button
          className="icon-btn accent"
          aria-label="Adicionar exercício"
          onClick={() => setPicking(true)}
        >
          <IconPlus size={20} />
        </button>
      </div>

      {session.exercises.length === 0 && (
        <div className="card">
          <p className="empty-text" style={{ textAlign: "center", margin: 8 }}>
            Toque no + para adicionar exercícios a este treino.
          </p>
        </div>
      )}

      {session.exercises.map((ex) => {
        const notes = variationNotes(data, ex.exerciseId, ex.variation);
        const running = timer?.exId === ex.id && timerRemaining > 0;
        return (
          <div className="card" key={ex.id}>
            <div className="ex-card-head">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="list-row-title">
                  {displayName(data, ex.exerciseId, ex.variation)}
                </div>
                <div className="list-row-sub">
                  {
                    data.exercises.find((e) => e.id === ex.exerciseId)
                      ?.muscleGroup
                  }
                </div>
              </div>
              {notes && (
                <button
                  className="icon-btn subtle"
                  aria-label="Ver observação da variação"
                  style={{
                    color:
                      notesFor === ex.id ? "var(--accent)" : "var(--text-2)",
                  }}
                  onClick={() =>
                    setNotesFor(notesFor === ex.id ? null : ex.id)
                  }
                >
                  <IconInfo size={20} />
                </button>
              )}
              <button
                className="icon-btn subtle"
                aria-label="Remover exercício"
                onClick={() => removeExercise(ex.id)}
              >
                <IconTrash size={20} />
              </button>
            </div>

            {notes && notesFor === ex.id && (
              <p className="ex-notes">{notes}</p>
            )}

            <div className={`${gridClass} set-head`}>
              <span>#</span>
              <span>Reps</span>
              <span>Carga (kg)</span>
              <span>Falha</span>
              {isToday && <span>Feita</span>}
              <span />
            </div>
            {ex.sets.map((set, setIndex) => (
              <div className={gridClass} key={set.id}>
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
                  className={`fail-btn${set.failure ? " on" : ""}`}
                  aria-label={
                    set.failure ? "Desmarcar falha" : "Marcar série até a falha"
                  }
                  onClick={() =>
                    patchSet(ex.id, set.id, { failure: !set.failure })
                  }
                >
                  F
                </button>
                {isToday && (
                  <button
                    className={`set-done-btn${set.done ? " done" : ""}`}
                    aria-label={set.done ? "Desmarcar série" : "Concluir série"}
                    onClick={() => patchSet(ex.id, set.id, { done: !set.done })}
                  >
                    <IconCheck size={20} />
                  </button>
                )}
                <button
                  className="set-remove-btn"
                  aria-label="Remover série"
                  onClick={() => removeSet(ex.id, set.id)}
                >
                  <IconClose size={15} />
                </button>
              </div>
            ))}

            <div className="row-gap" style={{ marginTop: 10 }}>
              <button className="btn btn-sm" onClick={() => addSet(ex.id)}>
                <IconPlus size={16} /> Série
              </button>
              {isToday && ex.restSeconds > 0 && (
                running ? (
                  <div className="rest-widget running">
                    <span>{formatClock(timerRemaining)}</span>
                    <button
                      onClick={() =>
                        setTimer((t) =>
                          t ? { ...t, endsAt: t.endsAt + 15000 } : t,
                        )
                      }
                    >
                      +15s
                    </button>
                    <button
                      aria-label="Cancelar descanso"
                      onClick={() => setTimer(null)}
                    >
                      <IconClose size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    className="rest-widget"
                    aria-label="Iniciar descanso"
                    onClick={() =>
                      setTimer({
                        exId: ex.id,
                        endsAt: Date.now() + ex.restSeconds * 1000,
                      })
                    }
                  >
                    <IconPlay size={16} />
                    <span>{formatClock(ex.restSeconds)}</span>
                  </button>
                )
              )}
            </div>
          </div>
        );
      })}

      <ExercisePicker
        open={picking}
        onClose={() => setPicking(false)}
        isAdded={isAdded}
        onToggle={toggleExercise}
      />

      <Sheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={session.routineName}
      >
        <button className="btn btn-danger btn-block" onClick={remove}>
          <IconTrash size={20} /> Excluir treino deste dia
        </button>
      </Sheet>
    </div>
  );
}
