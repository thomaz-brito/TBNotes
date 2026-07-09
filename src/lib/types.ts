// Modelos de dados do app.
// Por enquanto tudo é salvo no navegador (localStorage);
// quando o Supabase entrar, estes mesmos tipos viram tabelas no banco.

export type Exercise = {
  id: string;
  name: string;
  muscleGroup: string;
  /** Variações do movimento, ex.: "Reto (barra)", "Inclinado (halteres)". */
  variations: string[];
  notes?: string;
};

/** Uma série planejada dentro de um treino (rotina): reps e carga padrão. */
export type PlannedSet = {
  id: string;
  reps: number;
  weight: number; // em kg
};

/** Um exercício dentro de um treino, com suas séries padrão. */
export type RoutineExercise = {
  id: string;
  exerciseId: string;
  /** Variação escolhida (null = exercício sem variações). */
  variation: string | null;
  /** Descanso entre séries, em segundos. */
  restSeconds: number;
  sets: PlannedSet[];
};

/** Um treino reutilizável (ex.: "A - Superiores"). */
export type Routine = {
  id: string;
  name: string;
  exercises: RoutineExercise[];
  createdAt: string;
  updatedAt: string;
};

/** Uma série executada (ou a executar) na sessão do dia. */
export type SessionSet = {
  id: string;
  reps: number;
  weight: number;
  done: boolean;
};

export type SessionExercise = {
  id: string;
  exerciseId: string;
  variation: string | null;
  restSeconds: number;
  sets: SessionSet[];
};

/** Uma sessão de treino registrada (o "registro do dia"). */
export type Session = {
  id: string;
  routineId: string | null;
  routineName: string;
  startedAt: string;
  finishedAt: string | null;
  exercises: SessionExercise[];
};

export type AppData = {
  muscleGroups: string[];
  exercises: Exercise[];
  routines: Routine[];
  sessions: Session[];
};
