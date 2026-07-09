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
} from "./types";
import { createSeedData } from "./seed";

// Camada de dados do app. Hoje salva tudo no localStorage do navegador;
// quando conectarmos o Supabase, só esta camada muda — as telas continuam iguais.

const STORAGE_KEY = "tbnotes-data-v2";

function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppData;
      if (parsed && Array.isArray(parsed.exercises)) {
        return { ...parsed, sessions: parsed.sessions ?? [] };
      }
    }
  } catch {
    // dados corrompidos: recomeça do zero com a biblioteca padrão
  }
  return createSeedData();
}

type DataContextValue = {
  data: AppData;
  addMuscleGroup: (name: string) => void;
  addExercise: (exercise: Omit<Exercise, "id">) => void;
  updateExercise: (id: string, patch: Partial<Omit<Exercise, "id">>) => void;
  deleteExercise: (id: string) => void;
  addRoutine: (name: string) => Routine;
  updateRoutine: (id: string, update: (routine: Routine) => Routine) => void;
  deleteRoutine: (id: string) => void;
  duplicateRoutine: (id: string) => void;
  /** Inicia uma sessão a partir de um treino ("padrao") ou copiando a última sessão dele ("ultima"). */
  startSession: (routineId: string, mode: "padrao" | "ultima") => Session | null;
  updateSession: (id: string, update: (session: Session) => Session) => void;
  deleteSession: (id: string) => void;
};

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
      setData((d) => ({
        ...d,
        exercises: [...d.exercises, { ...exercise, id: crypto.randomUUID() }],
      }));
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

    startSession(routineId, mode) {
      const routine = data.routines.find((r) => r.id === routineId);
      if (!routine) return null;

      const lastSession =
        mode === "ultima"
          ? [...data.sessions]
              .filter((s) => s.routineId === routineId && s.finishedAt)
              .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0]
          : undefined;

      const exercises: SessionExercise[] = lastSession
        ? lastSession.exercises.map((se) => ({
            ...se,
            id: crypto.randomUUID(),
            sets: se.sets.map((s) => ({
              ...s,
              id: crypto.randomUUID(),
              done: false,
            })),
          }))
        : routine.exercises.map((re) => ({
            id: crypto.randomUUID(),
            exerciseId: re.exerciseId,
            variation: re.variation,
            restSeconds: re.restSeconds,
            sets: re.sets.map((s) => ({
              id: crypto.randomUUID(),
              reps: s.reps,
              weight: s.weight,
              done: false,
            })),
          }));

      const session: Session = {
        id: crypto.randomUUID(),
        routineId,
        routineName: routine.name,
        startedAt: new Date().toISOString(),
        finishedAt: null,
        exercises,
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
