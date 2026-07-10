import type { AppData } from "./types";
import { displayName } from "./data";

// Cálculos de progressão a partir das sessões registradas.
// Só séries marcadas como feitas entram nas contas.

/** 1RM estimada (fórmula de Epley): peso × (1 + reps/30).
 *  Exceção: série de 1 rep usa o próprio peso (a fórmula inflaria). */
export function e1rm(weight: number, reps: number): number {
  if (reps <= 1) return weight;
  return weight * (1 + reps / 30);
}

/** Séries confiáveis pra e1RM: 1 a 15 reps, com carga. */
function isReliableSet(set: { reps: number; weight: number; done: boolean }): boolean {
  return set.done && set.weight > 0 && set.reps >= 1 && set.reps <= 15;
}

export type ExercisePoint = {
  date: Date;
  /** Maior e1RM entre as séries do dia. */
  e1rm: number;
  /** Carga e reps da série de maior e1RM. */
  bestWeight: number;
  bestReps: number;
  volume: number; // Σ reps × carga (todas as séries feitas)
  failures: number;
};

export function exerciseSeries(
  data: AppData,
  exerciseId: string,
  variation: string | null,
): ExercisePoint[] {
  const points: ExercisePoint[] = [];
  for (const session of data.sessions) {
    let best = 0;
    let bestWeight = 0;
    let bestReps = 0;
    let volume = 0;
    let failures = 0;
    let hasSets = false;
    for (const ex of session.exercises) {
      if (ex.exerciseId !== exerciseId || ex.variation !== variation) continue;
      for (const set of ex.sets) {
        if (!set.done) continue;
        hasSets = true;
        volume += set.reps * set.weight;
        if (set.failure) failures += 1;
        if (isReliableSet(set)) {
          const est = e1rm(set.weight, set.reps);
          if (est > best) {
            best = est;
            bestWeight = set.weight;
            bestReps = set.reps;
          }
        }
      }
    }
    if (hasSets) {
      points.push({
        date: new Date(session.startedAt),
        e1rm: best,
        bestWeight,
        bestReps,
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

export type IndexPoint = { t: number; y: number };

/** Índice de força normalizado de um grupo muscular ao longo do tempo.
 *
 *  Não dá pra somar e1RMs de exercícios diferentes (escalas diferentes);
 *  então cada exercício vira um percentual da SUA primeira e1RM (= 100%),
 *  e o grupo é a média desses percentuais — cada exercício contribui com
 *  o quanto evoluiu, não com o quanto se levanta nele.
 */
export function groupStrengthIndex(data: AppData, group: string): IndexPoint[] {
  const groupOf = new Map(data.exercises.map((e) => [e.id, e.muscleGroup]));

  // melhor e1RM por (dia, exercício·variação) do grupo
  type DayEntry = { t: number; track: string; e1rm: number };
  const entries: DayEntry[] = [];
  for (const session of data.sessions) {
    const t = new Date(session.startedAt).getTime();
    for (const ex of session.exercises) {
      if (groupOf.get(ex.exerciseId) !== group) continue;
      let best = 0;
      for (const set of ex.sets) {
        if (!isReliableSet(set)) continue;
        best = Math.max(best, e1rm(set.weight, set.reps));
      }
      if (best > 0) {
        entries.push({ t, track: `${ex.exerciseId}|${ex.variation ?? ""}`, e1rm: best });
      }
    }
  }
  entries.sort((a, b) => a.t - b.t);

  // percorre no tempo mantendo o percentual mais recente de cada exercício
  const baseline = new Map<string, number>();
  const latest = new Map<string, number>();
  const points: IndexPoint[] = [];
  let i = 0;
  while (i < entries.length) {
    const t = entries[i].t;
    while (i < entries.length && entries[i].t === t) {
      const { track, e1rm: value } = entries[i];
      if (!baseline.has(track)) baseline.set(track, value);
      latest.set(track, (value / baseline.get(track)!) * 100);
      i++;
    }
    const values = [...latest.values()];
    points.push({
      t,
      y: values.reduce((sum, v) => sum + v, 0) / values.length,
    });
  }
  return points;
}
