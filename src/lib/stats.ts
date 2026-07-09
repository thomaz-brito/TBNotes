import type { AppData } from "./types";
import { displayName } from "./data";

// Cálculos de progressão a partir das sessões registradas.
// Só séries marcadas como feitas entram nas contas.

export type ExercisePoint = {
  date: Date;
  maxWeight: number;
  volume: number; // Σ reps × carga
  failures: number;
};

export function exerciseSeries(
  data: AppData,
  exerciseId: string,
  variation: string | null,
): ExercisePoint[] {
  const points: ExercisePoint[] = [];
  for (const session of data.sessions) {
    let maxWeight = 0;
    let volume = 0;
    let failures = 0;
    let hasSets = false;
    for (const ex of session.exercises) {
      if (ex.exerciseId !== exerciseId || ex.variation !== variation) continue;
      for (const set of ex.sets) {
        if (!set.done) continue;
        hasSets = true;
        volume += set.reps * set.weight;
        maxWeight = Math.max(maxWeight, set.weight);
        if (set.failure) failures += 1;
      }
    }
    if (hasSets) {
      points.push({
        date: new Date(session.startedAt),
        maxWeight,
        volume,
        failures,
      });
    }
  }
  return points.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export type TrackedExercise = {
  exerciseId: string;
  variation: string | null;
  label: string;
  sessions: number;
};

/** Exercícios que já têm registros, do mais treinado pro menos. */
export function trackedExercises(data: AppData): TrackedExercise[] {
  const counts = new Map<string, TrackedExercise>();
  for (const session of data.sessions) {
    for (const ex of session.exercises) {
      if (!ex.sets.some((s) => s.done)) continue;
      const key = `${ex.exerciseId}|${ex.variation ?? ""}`;
      const entry = counts.get(key);
      if (entry) {
        entry.sessions += 1;
      } else {
        counts.set(key, {
          exerciseId: ex.exerciseId,
          variation: ex.variation,
          label: displayName(data, ex.exerciseId, ex.variation),
          sessions: 1,
        });
      }
    }
  }
  return [...counts.values()].sort((a, b) => b.sessions - a.sessions);
}

export type WeekPoint = { weekStart: Date; volume: number; sets: number };

/** Volume semanal de um grupo muscular nas últimas `weeks` semanas (domingo a sábado). */
export function groupWeeklyVolume(
  data: AppData,
  group: string,
  weeks = 8,
): WeekPoint[] {
  const groupOf = new Map(data.exercises.map((e) => [e.id, e.muscleGroup]));

  const now = new Date();
  const currentWeekStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - now.getDay(),
  );

  const points: WeekPoint[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date(currentWeekStart);
    weekStart.setDate(weekStart.getDate() - i * 7);
    points.push({ weekStart, volume: 0, sets: 0 });
  }
  const firstStart = points[0].weekStart.getTime();

  for (const session of data.sessions) {
    const t = new Date(session.startedAt).getTime();
    if (t < firstStart) continue;
    const index = Math.floor((t - firstStart) / (7 * 24 * 3600 * 1000));
    const point = points[index];
    if (!point) continue;
    for (const ex of session.exercises) {
      if (groupOf.get(ex.exerciseId) !== group) continue;
      for (const set of ex.sets) {
        if (!set.done) continue;
        point.volume += set.reps * set.weight;
        point.sets += 1;
      }
    }
  }
  return points;
}
