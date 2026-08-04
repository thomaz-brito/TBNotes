import { supabase } from "./supabase";
import { createSeedData } from "./seed";
import type {
  AppData,
  Exercise,
  Routine,
  Session,
  Variation,
} from "./types";

// Tradução entre os tipos do app e as linhas das tabelas do Supabase.
// As telas nunca falam com o banco diretamente — só o DataProvider usa isto.

type ExerciseRow = {
  id: string;
  user_id: string;
  name: string;
  muscle_group: string;
  variations: Variation[];
};

type SettingsRow = {
  user_id: string;
  muscle_groups: string[];
  setups?: string[];
  default_setup?: string | null;
};

// As colunas de local/máquina são novas. Enquanto a migração não for
// aplicada no banco, o app segue funcionando: detectamos a ausência das
// colunas e gravamos sem elas (o campo fica só na sessão atual).
let setupColumns: boolean = true;

/** Erro do Postgres/PostgREST para coluna inexistente. */
function isMissingColumn(error: { code?: string; message?: string }): boolean {
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    /column .*(setups|default_setup)/i.test(error.message ?? "")
  );
}

export function hasSetupColumns(): boolean {
  return setupColumns;
}

type RoutineRow = {
  id: string;
  user_id: string;
  name: string;
  exercises: Routine["exercises"];
  created_at: string;
  updated_at: string;
};

type SessionRow = {
  id: string;
  user_id: string;
  routine_id: string | null;
  routine_name: string;
  started_at: string;
  exercises: Session["exercises"];
};

export function exerciseToRow(userId: string, e: Exercise): ExerciseRow {
  return {
    id: e.id,
    user_id: userId,
    name: e.name,
    muscle_group: e.muscleGroup,
    variations: e.variations,
  };
}

export async function saveExercises(
  userId: string,
  exercises: Exercise[],
): Promise<void> {
  const { error } = await supabase
    .from("exercises")
    .upsert(exercises.map((e) => exerciseToRow(userId, e)));
  if (error) throw error;
}

function settingsToRow(userId: string, data: AppData): SettingsRow {
  const row: SettingsRow = {
    user_id: userId,
    muscle_groups: data.muscleGroups,
  };
  if (setupColumns) {
    row.setups = data.setups;
    row.default_setup = data.defaultSetup;
  }
  return row;
}

/** Grava as configurações tolerando a ausência das colunas novas. */
export async function saveSettings(
  userId: string,
  data: AppData,
): Promise<void> {
  const { error } = await supabase
    .from("settings")
    .upsert(settingsToRow(userId, data));
  if (!error) return;
  if (!isMissingColumn(error)) throw error;

  // banco ainda sem a migração: regrava sem as colunas novas
  setupColumns = false;
  const { error: retry } = await supabase
    .from("settings")
    .upsert(settingsToRow(userId, data));
  if (retry) throw retry;
}

export function routineToRow(userId: string, r: Routine): RoutineRow {
  return {
    id: r.id,
    user_id: userId,
    name: r.name,
    exercises: r.exercises,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  };
}

export function sessionToRow(userId: string, s: Session): SessionRow {
  return {
    id: s.id,
    user_id: userId,
    routine_id: s.routineId,
    routine_name: s.routineName,
    started_at: s.startedAt,
    exercises: s.exercises,
  };
}

function rowToExercise(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    muscleGroup: row.muscle_group,
    variations: row.variations ?? [],
  };
}

function rowToRoutine(row: RoutineRow): Routine {
  return {
    id: row.id,
    name: row.name,
    exercises: row.exercises ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToSession(row: SessionRow): Session {
  return {
    id: row.id,
    routineId: row.routine_id,
    routineName: row.routine_name,
    startedAt: row.started_at,
    finishedAt: row.started_at, // legado
    exercises: (row.exercises ?? []).map((ex) => ({ ...ex, setup: ex.setup ?? null })),
  };
}

function withTimeout<T>(promise: PromiseLike<T>, ms = 12000): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), ms),
    ),
  ]);
}

/** Carrega tudo do banco. No primeiro acesso, planta a biblioteca padrão. */
export async function fetchAll(userId: string): Promise<AppData> {
  const [settings, exercises, routines, sessions] = await withTimeout(
    Promise.all([
      supabase.from("settings").select("*").maybeSingle(),
      supabase.from("exercises").select("*"),
      supabase.from("routines").select("*").order("created_at"),
      supabase.from("sessions").select("*").order("started_at"),
    ]),
  );

  for (const result of [settings, exercises, routines, sessions]) {
    if (result.error) throw result.error;
  }

  // detecta se a migração de local/máquina já foi aplicada
  const settingsRow = settings.data as SettingsRow | null;
  if (settingsRow) setupColumns = "setups" in settingsRow;

  // primeiro acesso: banco vazio → planta a biblioteca de exercícios padrão
  if (!settingsRow && (exercises.data?.length ?? 0) === 0) {
    const seed = createSeedData();
    await saveSettings(userId, seed);
    await saveExercises(userId, seed.exercises);
    return seed;
  }

  return {
    muscleGroups: settingsRow?.muscle_groups ?? [],
    setups: settingsRow?.setups ?? [],
    defaultSetup: settingsRow?.default_setup ?? null,
    exercises: ((exercises.data as ExerciseRow[]) ?? []).map(rowToExercise),
    routines: ((routines.data as RoutineRow[]) ?? []).map(rowToRoutine),
    sessions: ((sessions.data as SessionRow[]) ?? []).map(rowToSession),
  };
}

/** Substitui TODOS os dados do usuário no banco (importação de backup). */
export async function replaceAll(userId: string, data: AppData): Promise<void> {
  const del = async (table: string) => {
    const { error } = await supabase.from(table).delete().eq("user_id", userId);
    if (error) throw error;
  };
  await del("sessions");
  await del("routines");
  await del("exercises");
  await del("settings");

  await saveSettings(userId, data);

  const chunk = <T,>(list: T[], size = 100): T[][] => {
    const out: T[][] = [];
    for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
    return out;
  };

  for (const part of chunk(data.exercises)) {
    await saveExercises(userId, part);
  }
  for (const part of chunk(data.routines.map((r) => routineToRow(userId, r)))) {
    const { error } = await supabase.from("routines").insert(part);
    if (error) throw error;
  }
  for (const part of chunk(data.sessions.map((s) => sessionToRow(userId, s)))) {
    const { error } = await supabase.from("sessions").insert(part);
    if (error) throw error;
  }
}
