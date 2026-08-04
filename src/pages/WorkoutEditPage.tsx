import { useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { displayName, useData } from "../lib/data";
import { formatRest } from "../lib/format";
import { useDragReorder } from "../lib/useDragReorder";
import ExercisePicker from "../components/ExercisePicker";
import SetupPicker from "../components/SetupPicker";
import EmptyState from "../components/EmptyState";
import {
  IconChevronLeft,
  IconClose,
  IconDumbbell,
  IconGrip,
  IconMinus,
  IconPlus,
  IconTimer,
  IconTrash,
} from "../components/Icons";
import type { PlannedSet } from "../lib/types";

function parseReps(value: string): number {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function parseWeight(value: string): number {
  const n = parseFloat(value.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function newSet(base?: PlannedSet): PlannedSet {
  return {
    id: crypto.randomUUID(),
    reps: base?.reps ?? 10,
    weight: base?.weight ?? 0,
  };
}

const REST_STEP = 15; // segundos
const REST_MAX = 600;

export default function WorkoutEditPage() {
  const { id } = useParams();
  const { data, updateRoutine } = useData();
  const navigate = useNavigate();
  const location = useLocation();
  // treino recém-criado chega com openPicker: abre o seletor direto
  const [picking, setPicking] = useState(
    Boolean((location.state as { openPicker?: boolean } | null)?.openPicker),
  );

  // arrastar pra reordenar (pela alça ☰) — mecânica compartilhada
  const { drag, setCardRef, handleProps, dragStyle } = useDragReorder(
    (from, to) => {
      updateRoutine(routineId, (r) => {
        const exercises = [...r.exercises];
        const [item] = exercises.splice(from, 1);
        exercises.splice(to, 0, item);
        return { ...r, exercises };
      });
    },
  );

  const routine = data.routines.find((r) => r.id === id);
  if (!routine) return <Navigate to="/treinos" replace />;

  const routineId = routine.id;
  const exerciseCount = routine.exercises.length;

  function isAdded(exerciseId: string, variation: string | null): boolean {
    return routine!.exercises.some(
      (re) => re.exerciseId === exerciseId && re.variation === variation,
    );
  }

  function toggleExercise(exerciseId: string, variation: string | null) {
    updateRoutine(routineId, (r) => {
      const exists = r.exercises.some(
        (re) => re.exerciseId === exerciseId && re.variation === variation,
      );
      if (exists) {
        return {
          ...r,
          exercises: r.exercises.filter(
            (re) => !(re.exerciseId === exerciseId && re.variation === variation),
          ),
        };
      }
      return {
        ...r,
        exercises: [
          ...r.exercises,
          {
            id: crypto.randomUUID(),
            exerciseId,
            variation,
            // já entra com o local/máquina padrão do exercício, se houver
            setup:
              data.exercises.find((e) => e.id === exerciseId)?.defaultSetup ??
              null,
            restSeconds: 90,
            sets: [newSet(), newSet(), newSet()],
          },
        ],
      };
    });
  }

  function removeExercise(reId: string) {
    updateRoutine(routineId, (r) => ({
      ...r,
      exercises: r.exercises.filter((re) => re.id !== reId),
    }));
  }

  function addSet(reId: string) {
    updateRoutine(routineId, (r) => ({
      ...r,
      exercises: r.exercises.map((re) =>
        re.id === reId
          ? { ...re, sets: [...re.sets, newSet(re.sets[re.sets.length - 1])] }
          : re,
      ),
    }));
  }

  function removeSet(reId: string, setId: string) {
    updateRoutine(routineId, (r) => ({
      ...r,
      exercises: r.exercises.map((re) =>
        re.id === reId
          ? { ...re, sets: re.sets.filter((s) => s.id !== setId) }
          : re,
      ),
    }));
  }

  function patchSet(reId: string, setId: string, patch: Partial<PlannedSet>) {
    updateRoutine(routineId, (r) => ({
      ...r,
      exercises: r.exercises.map((re) =>
        re.id === reId
          ? {
              ...re,
              sets: re.sets.map((s) =>
                s.id === setId ? { ...s, ...patch } : s,
              ),
            }
          : re,
      ),
    }));
  }

  function changeRest(reId: string, delta: number) {
    updateRoutine(routineId, (r) => ({
      ...r,
      exercises: r.exercises.map((re) =>
        re.id === reId
          ? {
              ...re,
              restSeconds: Math.min(
                REST_MAX,
                Math.max(0, re.restSeconds + delta),
              ),
            }
          : re,
      ),
    }));
  }

  return (
    <div className="page">
      <header className="page-header" style={{ marginBottom: 4 }}>
        <button
          className="icon-btn"
          aria-label="Voltar"
          onClick={() => navigate("/treinos")}
        >
          <IconChevronLeft />
        </button>
        <button
          className="icon-btn accent"
          aria-label="Adicionar exercício"
          onClick={() => setPicking(true)}
        >
          <IconPlus />
        </button>
      </header>

      <input
        className="title-input"
        value={routine.name}
        aria-label="Nome do treino"
        onChange={(e) =>
          updateRoutine(routineId, (r) => ({ ...r, name: e.target.value }))
        }
      />
      <p className="page-subtitle" style={{ margin: "2px 0 16px" }}>
        Séries, repetições e cargas padrão. Segure em ☰ e arraste para
        reordenar.
      </p>

      {exerciseCount === 0 && (
        <div className="card">
          <EmptyState
            icon={<IconDumbbell size={40} />}
            title="Nenhum exercício neste treino"
            text="Toque no + para adicionar exercícios da sua biblioteca."
          />
        </div>
      )}

      {routine.exercises.map((re, index) => (
        <div
          className={`card${drag?.from === index ? " dragging" : ""}`}
          key={re.id}
          ref={setCardRef(index)}
          style={dragStyle(index)}
        >
          <div className="ex-card-head">
            <span
              className="drag-handle"
              aria-label="Arrastar para reordenar"
              {...handleProps(index, exerciseCount)}
            >
              <IconGrip size={22} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="list-row-title">
                {displayName(data, re.exerciseId, re.variation)}
              </div>
              <div className="list-row-sub">
                {data.exercises.find((e) => e.id === re.exerciseId)?.muscleGroup}
              </div>
            </div>
            <button
              className="icon-btn subtle"
              aria-label="Remover exercício"
              onClick={() => removeExercise(re.id)}
            >
              <IconTrash size={20} />
            </button>
          </div>

          <div className="set-grid set-head">
            <span>Série</span>
            <span>Reps</span>
            <span>Carga (kg)</span>
            <span />
          </div>
          {re.sets.map((set, setIndex) => (
            <div className="set-grid" key={set.id}>
              <span className="set-index">{setIndex + 1}</span>
              <input
                className="num-input"
                inputMode="numeric"
                defaultValue={set.reps || ""}
                placeholder="0"
                onChange={(e) =>
                  patchSet(re.id, set.id, { reps: parseReps(e.target.value) })
                }
              />
              <input
                className="num-input"
                inputMode="decimal"
                defaultValue={set.weight || ""}
                placeholder="0"
                onChange={(e) =>
                  patchSet(re.id, set.id, {
                    weight: parseWeight(e.target.value),
                  })
                }
              />
              <button
                className="icon-btn subtle"
                aria-label="Remover série"
                onClick={() => removeSet(re.id, set.id)}
              >
                <IconClose size={18} />
              </button>
            </div>
          ))}

          <div className="row-gap" style={{ marginTop: 10, flexWrap: "wrap" }}>
            <button className="btn btn-sm" onClick={() => addSet(re.id)}>
              <IconPlus size={16} /> Série
            </button>
            <SetupPicker
              setups={
                data.exercises.find((e) => e.id === re.exerciseId)?.setups ?? []
              }
              value={re.setup}
              onChange={(setup) =>
                updateRoutine(routineId, (r) => ({
                  ...r,
                  exercises: r.exercises.map((x) =>
                    x.id === re.id ? { ...x, setup } : x,
                  ),
                }))
              }
            />
            <div className="rest-control">
              <IconTimer size={18} />
              <button
                className="icon-btn subtle rest-btn"
                aria-label="Diminuir descanso"
                onClick={() => changeRest(re.id, -REST_STEP)}
              >
                <IconMinus size={16} />
              </button>
              <span className="rest-value">{formatRest(re.restSeconds)}</span>
              <button
                className="icon-btn subtle rest-btn"
                aria-label="Aumentar descanso"
                onClick={() => changeRest(re.id, REST_STEP)}
              >
                <IconPlus size={16} />
              </button>
            </div>
          </div>
        </div>
      ))}

      {exerciseCount > 0 && (
        <button
          className="btn btn-primary btn-block"
          onClick={() => setPicking(true)}
        >
          <IconPlus size={20} /> Adicionar exercício
        </button>
      )}

      <ExercisePicker
        open={picking}
        onClose={() => setPicking(false)}
        isAdded={isAdded}
        onToggle={toggleExercise}
      />
    </div>
  );
}
