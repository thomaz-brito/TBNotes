import { useRef, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { displayName, useData } from "../lib/data";
import { formatRest } from "../lib/format";
import ExercisePicker from "../components/ExercisePicker";
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

  // ---- arrastar pra reordenar ----
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const dragState = useRef<{ index: number; grabOffset: number } | null>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);

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

  function move(index: number, delta: number) {
    updateRoutine(routineId, (r) => {
      const target = index + delta;
      if (target < 0 || target >= r.exercises.length) return r;
      const exercises = [...r.exercises];
      const [item] = exercises.splice(index, 1);
      exercises.splice(target, 0, item);
      return { ...r, exercises };
    });
  }

  function onDragStart(e: React.PointerEvent, index: number) {
    const card = cardRefs.current[index];
    if (!card) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragState.current = {
      index,
      grabOffset: e.clientY - card.getBoundingClientRect().top,
    };
    setDragIndex(index);
    setDragOffset(0);
  }

  function onDragMove(e: React.PointerEvent) {
    const st = dragState.current;
    if (!st) return;
    const card = cardRefs.current[st.index];
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const desiredTop = e.clientY - st.grabOffset;
    setDragOffset(desiredTop - rect.top);

    const centerY = desiredTop + rect.height / 2;
    const prev =
      st.index > 0 ? cardRefs.current[st.index - 1]?.getBoundingClientRect() : null;
    const next =
      st.index < exerciseCount - 1
        ? cardRefs.current[st.index + 1]?.getBoundingClientRect()
        : null;

    if (prev && centerY < prev.top + prev.height / 2) {
      move(st.index, -1);
      st.index -= 1;
      setDragIndex(st.index);
    } else if (next && centerY > next.top + next.height / 2) {
      move(st.index, 1);
      st.index += 1;
      setDragIndex(st.index);
    }
  }

  function onDragEnd() {
    dragState.current = null;
    setDragIndex(null);
    setDragOffset(0);
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
          className={`card${dragIndex === index ? " dragging" : ""}`}
          key={re.id}
          ref={(el) => {
            cardRefs.current[index] = el;
          }}
          style={
            dragIndex === index
              ? { transform: `translateY(${dragOffset}px)` }
              : undefined
          }
        >
          <div className="ex-card-head">
            <span
              className="drag-handle"
              aria-label="Arrastar para reordenar"
              onPointerDown={(e) => onDragStart(e, index)}
              onPointerMove={onDragMove}
              onPointerUp={onDragEnd}
              onPointerCancel={onDragEnd}
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

          <div className="row-gap" style={{ marginTop: 10 }}>
            <button className="btn btn-sm" onClick={() => addSet(re.id)}>
              <IconPlus size={16} /> Série
            </button>
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
