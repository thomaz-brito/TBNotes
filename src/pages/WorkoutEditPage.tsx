import { useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { groupOrder, useData } from "../lib/data";
import Sheet from "../components/Sheet";
import EmptyState from "../components/EmptyState";
import {
  IconArrowDown,
  IconArrowUp,
  IconChevronLeft,
  IconClose,
  IconDumbbell,
  IconPlus,
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

export default function WorkoutEditPage() {
  const { id } = useParams();
  const { data, updateRoutine } = useData();
  const navigate = useNavigate();
  const location = useLocation();
  // treino recém-criado chega com openPicker: abre o seletor direto
  const [picking, setPicking] = useState(
    Boolean((location.state as { openPicker?: boolean } | null)?.openPicker),
  );
  const [pickerSearch, setPickerSearch] = useState("");
  const [justAdded, setJustAdded] = useState<string[]>([]);

  const routine = data.routines.find((r) => r.id === id);
  if (!routine) return <Navigate to="/treinos" replace />;

  const routineId = routine.id;
  const exerciseById = new Map(data.exercises.map((e) => [e.id, e]));
  const groups = groupOrder(data);
  const query = pickerSearch.trim().toLowerCase();
  const pickable = data.exercises.filter((e) =>
    e.name.toLowerCase().includes(query),
  );

  function addExerciseToRoutine(exerciseId: string) {
    updateRoutine(routineId, (r) => ({
      ...r,
      exercises: [
        ...r.exercises,
        {
          id: crypto.randomUUID(),
          exerciseId,
          sets: [newSet(), newSet(), newSet()],
        },
      ],
    }));
    setJustAdded((ids) => [...ids, exerciseId]);
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
          onClick={() => {
            setPickerSearch("");
            setJustAdded([]);
            setPicking(true);
          }}
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
        Séries, repetições e cargas padrão — seu ponto de partida no dia do
        treino.
      </p>

      {routine.exercises.length === 0 && (
        <div className="card">
          <EmptyState
            icon={<IconDumbbell size={40} />}
            title="Nenhum exercício neste treino"
            text="Toque no + para adicionar exercícios da sua biblioteca."
          />
        </div>
      )}

      {routine.exercises.map((re, index) => {
        const exercise = exerciseById.get(re.exerciseId);
        return (
          <div className="card" key={re.id}>
            <div className="ex-card-head">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="list-row-title">
                  {exercise?.name ?? "Exercício removido"}
                </div>
                <div className="list-row-sub">{exercise?.muscleGroup}</div>
              </div>
              <button
                className="icon-btn subtle"
                aria-label="Mover para cima"
                disabled={index === 0}
                style={{ opacity: index === 0 ? 0.3 : 1 }}
                onClick={() => move(index, -1)}
              >
                <IconArrowUp size={20} />
              </button>
              <button
                className="icon-btn subtle"
                aria-label="Mover para baixo"
                disabled={index === routine.exercises.length - 1}
                style={{
                  opacity: index === routine.exercises.length - 1 ? 0.3 : 1,
                }}
                onClick={() => move(index, 1)}
              >
                <IconArrowDown size={20} />
              </button>
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
            <button className="btn btn-sm" onClick={() => addSet(re.id)}>
              <IconPlus size={16} /> Adicionar série
            </button>
          </div>
        );
      })}

      {routine.exercises.length > 0 && (
        <button
          className="btn btn-primary btn-block"
          onClick={() => {
            setPickerSearch("");
            setJustAdded([]);
            setPicking(true);
          }}
        >
          <IconPlus size={20} /> Adicionar exercício
        </button>
      )}

      {/* Seletor de exercícios da biblioteca */}
      <Sheet
        open={picking}
        onClose={() => setPicking(false)}
        title="Adicionar exercício"
      >
        <input
          className="input search-input"
          type="search"
          placeholder="Buscar exercício…"
          value={pickerSearch}
          onChange={(e) => setPickerSearch(e.target.value)}
        />
        {groups.map((group) => {
          const items = pickable.filter((e) => e.muscleGroup === group);
          if (items.length === 0) return null;
          return (
            <section key={group}>
              <p className="section-title">{group}</p>
              <div className="list">
                {items.map((exercise) => {
                  const added = justAdded.includes(exercise.id);
                  return (
                    <button
                      key={exercise.id}
                      className="list-row"
                      onClick={() => addExerciseToRoutine(exercise.id)}
                    >
                      <div className="list-row-main">
                        <div className="list-row-title">{exercise.name}</div>
                        {added && (
                          <div
                            className="list-row-sub"
                            style={{ color: "var(--accent)" }}
                          >
                            Adicionado ✓
                          </div>
                        )}
                      </div>
                      <span className="chevron">
                        <IconPlus size={20} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
        <button
          className="btn btn-primary btn-block"
          style={{ marginTop: 8 }}
          onClick={() => setPicking(false)}
        >
          Concluir
        </button>
      </Sheet>
    </div>
  );
}
