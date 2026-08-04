// Modelos de dados do app.
// Por enquanto tudo é salvo no navegador (localStorage);
// quando o Supabase entrar, estes mesmos tipos viram tabelas no banco.

/** Uma variação de um exercício, com observação própria (dicas de execução). */
export type Variation = {
  name: string;
  notes?: string;
};

export type Exercise = {
  id: string;
  name: string;
  muscleGroup: string;
  /** Variações do movimento, ex.: "Reto (barra)", "Inclinado (halteres)". */
  variations: Variation[];
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
  /** Série levada até a falha. */
  failure: boolean;
};

export type SessionExercise = {
  id: string;
  exerciseId: string;
  variation: string | null;
  /** Local em que o treino do dia foi feito. Escolhido uma vez por treino,
   *  no topo do registro, e replicado nos exercícios dele. Opcional. */
  setup: string | null;
  restSeconds: number;
  sets: SessionSet[];
};

/** Uma sessão de treino registrada (o "registro do dia"). */
export type Session = {
  id: string;
  routineId: string | null;
  routineName: string;
  startedAt: string;
  /** Legado: sem uso na interface (um treino registrado = realizado). */
  finishedAt: string | null;
  exercises: SessionExercise[];
};

export type AppData = {
  muscleGroups: string[];
  /** Locais/máquinas do usuário, ex.: "Vila Olímpia", "Zona Norte".
   *  Valem para todos os exercícios: a mesma variação pode pesar
   *  diferente conforme a academia ou o aparelho. */
  setups: string[];
  /** Local que já vem selecionado ao registrar um exercício. */
  defaultSetup: string | null;
  exercises: Exercise[];
  routines: Routine[];
  sessions: Session[];
};
