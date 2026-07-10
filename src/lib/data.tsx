import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type {
  AppData,
  Exercise,
  Routine,
  Session,
  SessionExercise,
  Variation,
} from "./types";
import { createSeedData } from "./seed";
import { buildDemoData } from "./demo";
import { keyToDate, todayKey } from "./format";

// Camada de dados do app. Hoje salva tudo no localStorage do navegador;
// quando conectarmos o Supabase, só esta camada muda — as telas continuam iguais.

// v3: substitui os registros de teste por 8 semanas de dados fictícios
// realistas, pra avaliar os gráficos antes do uso de verdade.
const STORAGE_KEY = "tbnotes-data-v3";

function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppData;
      if (parsed && Array.isArray(parsed.exercises)) {
        // normaliza dados de versões anteriores:
        // - "failure" pode não existir nas séries
        // - variações eram strings simples (agora têm observação própria)
        const sessions = (parsed.sessions ?? []).map((s) => ({
          ...s,
          exercises: s.exercises.map((ex) => ({
            ...ex,
            sets: ex.sets.map((set) => ({ ...set, failure: set.failure ?? false })),
          })),
        }));
        const exercises = parsed.exercises.map((e) => ({
          ...e,
          variations: ((e.variations ?? []) as Array<Variation | string>).map(
            (v) => (typeof v === "string" ? { name: v } : v),
          ),
        }));
        return { ...parsed, sessions, exercises };
      }
    }
  } catch {
    // dados corrompidos: recomeça do zero com a biblioteca padrão
  }
  return buildDemoData(createSeedData());
}

type DataContextValue = {
  data: AppData;
  addMuscleGroup: (name: string) => void;
  addExercise: (exercise: Omit<Exercise, "id">) => Exercise;
  updateExercise: (id: string, patch: Partial<Omit<Exercise, "id">>) => void;
  deleteExercise: (id: string) => void;
  addRoutine: (name: string) => Routine;
  updateRoutine: (id: string, update: (routine: Routine) => Routine) => void;
  deleteRoutine: (id: string) => void;
  duplicateRoutine: (id: string) => void;
  /** Inicia uma sessão a partir de um treino salvo, no dia indicado (YYYY-MM-DD). */
  startSession: (routineId: string, dayKey: string) => Session | null;
  /** Copia uma sessão existente para o dia indicado. */
  copySession: (sourceId: string, dayKey: string) => Session | null;
  /** Cria uma sessão vazia (treino montado do zero) no dia indicado. */
  createEmptySession: (dayKey: string) => Session;
  updateSession: (id: string, update: (session: Session) => Session) => void;
  deleteSession: (id: string) => void;
};

/** Datas de início/fim de uma sessão criada no dia `dayKey`.
 *  Hoje: começa agora e fica "em andamento". Outro dia: registrada como concluída. */
function sessionTimestamps(dayKey: string): {
  startedAt: string;
  finishedAt: string | null;
  isPast: boolean;
} {
  if (dayKey === todayKey()) {
    return { startedAt: new Date().toISOString(), finishedAt: null, isPast: false };
  }
  const iso = keyToDate(dayKey).toISOString();
  return { startedAt: iso, finishedAt: iso, isPast: true };
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(loadData);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const value: DataContextValue = {
    data,

    addMuscleGroup(name) {
      setData((d) =>
        d.muscleGroups.includes(name)
          ? d
          : { ...d, muscleGroups: [...d.muscleGroups, name] },
      );
    },

    addExercise(exercise) {
      const created: Exercise = { ...exercise, id: crypto.randomUUID() };
      setData((d) => ({ ...d, exercises: [...d.exercises, created] }));
      return created;
    },

    updateExercise(id, patch) {
      setData((d) => ({
        ...d,
        exercises: d.exercises.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      }));
    },

    deleteExercise(id) {
      setData((d) => ({
        ...d,
        exercises: d.exercises.filter((e) => e.id !== id),
        routines: d.routines.map((r) => ({
          ...r,
          exercises: r.exercises.filter((re) => re.exerciseId !== id),
        })),
      }));
    },

    addRoutine(name) {
      const now = new Date().toISOString();
      const routine: Routine = {
        id: crypto.randomUUID(),
        name,
        exercises: [],
        createdAt: now,
        updatedAt: now,
      };
      setData((d) => ({ ...d, routines: [...d.routines, routine] }));
      return routine;
    },

    updateRoutine(id, update) {
      setData((d) => ({
        ...d,
        routines: d.routines.map((r) =>
          r.id === id
            ? { ...update(r), updatedAt: new Date().toISOString() }
            : r,
        ),
      }));
    },

    deleteRoutine(id) {
      setData((d) => ({
        ...d,
        routines: d.routines.filter((r) => r.id !== id),
      }));
    },

    duplicateRoutine(id) {
      setData((d) => {
        const original = d.routines.find((r) => r.id === id);
        if (!original) return d;
        const now = new Date().toISOString();
        const copy: Routine = {
          ...original,
          id: crypto.randomUUID(),
          name: `${original.name} (cópia)`,
          exercises: original.exercises.map((re) => ({
            ...re,
            id: crypto.randomUUID(),
            sets: re.sets.map((s) => ({ ...s, id: crypto.randomUUID() })),
          })),
          createdAt: now,
          updatedAt: now,
        };
        return { ...d, routines: [...d.routines, copy] };
      });
    },

    startSession(routineId, dayKey) {
      const routine = data.routines.find((r) => r.id === routineId);
      if (!routine) return null;

      const { startedAt, finishedAt, isPast } = sessionTimestamps(dayKey);
      const exercises: SessionExercise[] = routine.exercises.map((re) => ({
        id: crypto.randomUUID(),
        exerciseId: re.exerciseId,
        variation: re.variation,
        restSeconds: re.restSeconds,
        sets: re.sets.map((s) => ({
          id: crypto.randomUUID(),
          reps: s.reps,
          weight: s.weight,
          done: isPast, // registrando dia passado: assume séries feitas
          failure: false,
        })),
      }));

      const session: Session = {
        id: crypto.randomUUID(),
        routineId,
        routineName: routine.name,
        startedAt,
        finishedAt,
        exercises,
      };
      setData((d) => ({ ...d, sessions: [...d.sessions, session] }));
      return session;
    },

    copySession(sourceId, dayKey) {
      const source = data.sessions.find((s) => s.id === sourceId);
      if (!source) return null;

      const { startedAt, finishedAt, isPast } = sessionTimestamps(dayKey);
      const session: Session = {
        id: crypto.randomUUID(),
        routineId: source.routineId,
        routineName: source.routineName,
        startedAt,
        finishedAt,
        exercises: source.exercises.map((se) => ({
          ...se,
          id: crypto.randomUUID(),
          // mantém reps, cargas e marcações de falha da sessão copiada
          sets: se.sets.map((s) => ({
            ...s,
            id: crypto.randomUUID(),
            done: isPast,
          })),
        })),
      };
      setData((d) => ({ ...d, sessions: [...d.sessions, session] }));
      return session;
    },

    createEmptySession(dayKey) {
      const { startedAt, finishedAt } = sessionTimestamps(dayKey);
      const session: Session = {
        id: crypto.randomUUID(),
        routineId: null,
        routineName: "Treino avulso",
        startedAt,
        finishedAt,
        exercises: [],
      };
      setData((d) => ({ ...d, sessions: [...d.sessions, session] }));
      return session;
    },

    updateSession(id, update) {
      setData((d) => ({
        ...d,
        sessions: d.sessions.map((s) => (s.id === id ? update(s) : s)),
      }));
    },

    deleteSession(id) {
      setData((d) => ({
        ...d,
        sessions: d.sessions.filter((s) => s.id !== id),
      }));
    },
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData deve ser usado dentro de <DataProvider>");
  return ctx;
}

/** Ordena os grupos musculares na ordem da lista de grupos do app. */
export function groupOrder(data: AppData): string[] {
  const extras = [
    ...new Set(
      data.exercises
        .map((e) => e.muscleGroup)
        .filter((g) => !data.muscleGroups.includes(g)),
    ),
  ];
  return [...data.muscleGroups, ...extras];
}

/** A sessão em andamento (se houver). */
export function activeSession(data: AppData): Session | undefined {
  return data.sessions.find((s) => !s.finishedAt);
}

/** Paleta de cores dos templates (bolinhas do calendário). */
const ROUTINE_COLORS = [
  "#10b981", // verde
  "#3b82f6", // azul
  "#f59e0b", // âmbar
  "#ec4899", // rosa
  "#8b5cf6", // roxo
  "#ef4444", // vermelho
  "#14b8a6", // teal
  "#f97316", // laranja
];

const MANUAL_COLOR = "#9ca3af"; // cinza: treino avulso ou template removido

/** Cor associada a um template de treino (cinza para treinos avulsos). */
export function routineColor(data: AppData, routineId: string | null): string {
  if (!routineId) return MANUAL_COLOR;
  const index = data.routines.findIndex((r) => r.id === routineId);
  if (index === -1) return MANUAL_COLOR;
  return ROUTINE_COLORS[index % ROUTINE_COLORS.length];
}

/** Nome de exibição de um exercício + variação, ex.: "Supino · Inclinado (barra)". */
export function displayName(
  data: AppData,
  exerciseId: string,
  variation: string | null,
): string {
  const exercise = data.exercises.find((e) => e.id === exerciseId);
  if (!exercise) return "Exercício removido";
  return variation ? `${exercise.name} · ${variation}` : exercise.name;
}

/** Observação da variação usada num exercício da sessão/treino (se houver). */
export function variationNotes(
  data: AppData,
  exerciseId: string,
  variation: string | null,
): string | undefined {
  if (!variation) return undefined;
  const exercise = data.exercises.find((e) => e.id === exerciseId);
  return exercise?.variations.find((v) => v.name === variation)?.notes;
}
