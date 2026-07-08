// Modelos de dados do app.
// Por enquanto tudo é salvo no navegador (localStorage);
// quando o Supabase entrar, estes mesmos tipos viram tabelas no banco.

export type Exercise = {
  id: string;
  name: string;
  muscleGroup: string;
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

export type AppData = {
  muscleGroups: string[];
  exercises: Exercise[];
  routines: Routine[];
};
