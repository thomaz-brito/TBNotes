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

  // ---- arrastar pra reordenar (pela alça ☰) ----
  // Durante o arraste nada muda no estado dos dados: o cartão segue o dedo,
  // os vizinhos deslizam visualmente e a troca é aplicada só ao soltar.
  // Tudo em coordenadas do DOCUMENTO (não da janela), pra rolagem automática
  // perto das bordas funcionar sem desalinhar o cartão do dedo.
  const CARD_GAP = 12;
  const [drag, setDrag] = useState<{
    from: number;
    to: number;
    dy: number;
    height: number; // altura do cartão arrastado + espaçamento
  } | null>(null);
  const dragRef = useRef<{
    from: number;
    to: number;
    startPointerDoc: number;
    lastClientY: number;
    slots: Array<{ top: number; height: number }>; // em coords do documento
  } | null>(null);
  const rafId = useRef<number | null>(null);
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

  function updateDrag(clientY: number) {
    const st = dragRef.current;
    if (!st) return;
    const pointerDoc = clientY + window.scrollY;
    const dy = pointerDoc - st.startPointerDoc;
    const center = st.slots[st.from].top + st.slots[st.from].height / 2 + dy;

    // destino: comparações contra os pontos médios ORIGINAIS dos vizinhos
    let to = st.from;
    for (let i = 0; i < st.slots.length; i++) {
      if (i === st.from) continue;
      const mid = st.slots[i].top + st.slots[i].height / 2;
      if (i < st.from && center < mid) to = Math.min(to, i);
      if (i > st.from && center > mid) to = Math.max(to, i);
    }

    st.to = to;
    setDrag({
      from: st.from,
      to,
      dy,
      height: st.slots[st.from].height + CARD_GAP,
    });
  }

  /** Rolagem automática: dedo perto da borda de cima/baixo rola a página. */
  function autoScrollTick() {
    const st = dragRef.current;
    if (!st) return;
    const EDGE = 110; // zona de ativação, em px
    const MAX_SPEED = 16; // px por quadro
    const bottomStart = window.innerHeight - EDGE - 70; // desconta a barra de abas
    const y = st.lastClientY;

    let speed = 0;
    if (y < EDGE) {
      speed = -Math.ceil(((EDGE - y) / EDGE) * MAX_SPEED);
    } else if (y > bottomStart) {
      speed = Math.ceil(((y - bottomStart) / EDGE) * MAX_SPEED);
    }

    if (speed !== 0) {
      window.scrollBy(0, speed);
      updateDrag(y); // a página rolou: o ponto do documento sob o dedo mudou
    }
    rafId.current = requestAnimationFrame(autoScrollTick);
  }

  function onDragStart(e: React.PointerEvent, index: number) {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const slots = routine!.exercises.map((_, i) => {
      const rect = cardRefs.current[i]?.getBoundingClientRect();
      return {
        top: (rect?.top ?? 0) + window.scrollY,
        height: rect?.height ?? 0,
      };
    });
    dragRef.current = {
      from: index,
      to: index,
      startPointerDoc: e.clientY + window.scrollY,
      lastClientY: e.clientY,
      slots,
    };
    setDrag({
      from: index,
      to: index,
      dy: 0,
      height: slots[index].height + CARD_GAP,
    });
    rafId.current = requestAnimationFrame(autoScrollTick);
  }

  function onDragMove(e: React.PointerEvent) {
    const st = dragRef.current;
    if (!st) return;
    st.lastClientY = e.clientY;
    updateDrag(e.clientY);
  }

  function onDragEnd() {
    if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    rafId.current = null;
    const st = dragRef.current;
    dragRef.current = null;
    setDrag(null);
    if (st && st.to !== st.from) {
      updateRoutine(routineId, (r) => {
        const exercises = [...r.exercises];
        const [item] = exercises.splice(st.from, 1);
        exercises.splice(st.to, 0, item);
        return { ...r, exercises };
      });
    }
  }

  /** Deslocamento visual de cada cartão durante o arraste. */
  function dragStyle(index: number): React.CSSProperties | undefined {
    if (!drag) return undefined;
    if (index === drag.from) {
      return {
        transform: `translateY(${drag.dy}px)`,
        transition: "none",
        zIndex: 10,
        position: "relative",
      };
    }
    let shift = 0;
    if (drag.from < drag.to && index > drag.from && index <= drag.to) {
      shift = -drag.height;
    } else if (drag.from > drag.to && index >= drag.to && index < drag.from) {
      shift = drag.height;
    }
    return { transform: `translateY(${shift}px)`, transition: "transform 0.15s" };
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
          ref={(el) => {
            cardRefs.current[index] = el;
          }}
          style={dragStyle(index)}
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
