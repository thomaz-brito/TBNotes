import type { AppData, SessionExercise } from "./types";
import { displayName } from "./data";

// Cálculos de progressão a partir das sessões registradas.
// Tudo aqui é calculado em tempo de leitura, a partir das séries salvas:
// nenhuma métrica é gravada no banco e nenhum dado bruto é alterado.

/** 1RM estimada (fórmula de Epley): peso × (1 + reps/30).
 *  Exceção: série de 1 rep usa o próprio peso (a fórmula inflaria). */
export function e1rm(weight: number, reps: number): number {
  if (reps <= 1) return weight;
  return weight * (1 + reps / 30);
}

/** Séries que entram nos cálculos de e1RM: qualquer nº de reps, com carga. */
function isValidSet(set: { reps: number; weight: number }): boolean {
  return set.weight > 0 && set.reps >= 1;
}

/** Pontuação de um exercício num dia: MÉDIA das e1RMs das séries válidas.
 *
 *  A média (e não a melhor série) capta ganhos de consistência:
 *  10×20kg + 8×20kg num dia e 10×20kg + 10×20kg no outro têm a mesma
 *  melhor série, mas a média sobe corretamente no segundo dia.
 */
export function dayScore(exercise: SessionExercise): {
  score: number;
  avgWeight: number;
  avgReps: number;
  validSets: number;
} {
  let sumE1rm = 0;
  let sumWeight = 0;
  let sumReps = 0;
  let count = 0;
  for (const set of exercise.sets) {
    if (!isValidSet(set)) continue;
    sumE1rm += e1rm(set.weight, set.reps);
    sumWeight += set.weight;
    sumReps += set.reps;
    count += 1;
  }
  if (count === 0) return { score: 0, avgWeight: 0, avgReps: 0, validSets: 0 };
  return {
    score: sumE1rm / count,
    avgWeight: sumWeight / count,
    avgReps: sumReps / count,
    validSets: count,
  };
}

// ---------- janela de análise ----------

/** Intervalo de datas considerado (em ms). null = todo o histórico. */
export type TimeWindow = { from: number; to: number } | null;

function inWindow(t: number, window: TimeWindow): boolean {
  return !window || (t >= window.from && t <= window.to);
}

/** Identidade de uma "linha de progressão": exercício + variação + local.
 *
 *  O local entra na identidade porque a mesma variação costuma pesar
 *  diferente em cada academia/aparelho: misturá-los criaria degraus no
 *  gráfico que não representam ganho nem perda de força. Como cada local
 *  é um trilho próprio, a estreia num local novo cai na regra de
 *  imputação (nasce valendo o índice atual do grupo).
 */
function trackKey(ex: SessionExercise): string {
  return `${ex.exerciseId}|${ex.variation ?? ""}|${ex.setup ?? ""}`;
}

// ---------- por exercício ----------

export type ExercisePoint = {
  date: Date;
  /** Média das e1RMs das séries válidas do dia. */
  e1rm: number;
  /** Médias de carga e reps das séries válidas (base da dispersão). */
  avgWeight: number;
  avgReps: number;
  validSets: number;
  /** Σ reps × carga de todas as séries registradas no dia. */
  volume: number;
  failures: number;
};

export function exerciseSeries(
  data: AppData,
  exerciseId: string,
  variation: string | null,
  window: TimeWindow = null,
  /** undefined = todos os locais; string|null = só aquele local. */
  setup?: string | null,
): ExercisePoint[] {
  const points: ExercisePoint[] = [];
  for (const session of data.sessions) {
    const t = new Date(session.startedAt).getTime();
    if (!inWindow(t, window)) continue;

    let sumE1rm = 0;
    let sumWeight = 0;
    let sumReps = 0;
    let validSets = 0;
    let volume = 0;
    let failures = 0;
    let hasSets = false;

    for (const ex of session.exercises) {
      if (ex.exerciseId !== exerciseId || ex.variation !== variation) continue;
      if (setup !== undefined && (ex.setup ?? null) !== setup) continue;
      for (const set of ex.sets) {
        if (set.reps <= 0) continue; // série vazia (placeholder)
        hasSets = true;
        volume += set.reps * set.weight;
        if (set.failure) failures += 1;
        if (isValidSet(set)) {
          sumE1rm += e1rm(set.weight, set.reps);
          sumWeight += set.weight;
          sumReps += set.reps;
          validSets += 1;
        }
      }
    }

    if (hasSets) {
      points.push({
        date: new Date(session.startedAt),
        e1rm: validSets > 0 ? sumE1rm / validSets : 0,
        avgWeight: validSets > 0 ? sumWeight / validSets : 0,
        avgReps: validSets > 0 ? sumReps / validSets : 0,
        validSets,
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

/** Locais em que um exercício·variação foi registrado, do mais usado ao menos.
 *  `null` representa registros sem local informado. */
export function setupsForExercise(
  data: AppData,
  exerciseId: string,
  variation: string | null,
  window: TimeWindow = null,
): Array<{ setup: string | null; sessions: number }> {
  const counts = new Map<string, { setup: string | null; sessions: number }>();
  for (const session of data.sessions) {
    if (!inWindow(new Date(session.startedAt).getTime(), window)) continue;
    for (const ex of session.exercises) {
      if (ex.exerciseId !== exerciseId || ex.variation !== variation) continue;
      if (!ex.sets.some((s) => s.reps > 0)) continue;
      const setup = ex.setup ?? null;
      const key = setup ?? "";
      const entry = counts.get(key);
      if (entry) entry.sessions += 1;
      else counts.set(key, { setup, sessions: 1 });
    }
  }
  return [...counts.values()].sort((a, b) => b.sessions - a.sessions);
}

/** Exercícios com registros na janela, do mais treinado pro menos. */
export function trackedExercises(
  data: AppData,
  window: TimeWindow = null,
): TrackedExercise[] {
  const counts = new Map<string, TrackedExercise>();
  for (const session of data.sessions) {
    if (!inWindow(new Date(session.startedAt).getTime(), window)) continue;
    for (const ex of session.exercises) {
      if (!ex.sets.some((s) => s.reps > 0)) continue;
      const key = trackKey(ex);
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

// ---------- índice de força por grupo muscular ----------

export type IndexPoint = { t: number; y: number };

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Índice de força de um grupo muscular ao longo do tempo, por IMPUTAÇÃO.
 *
 *  Cada exercício (exercício + variação) é expresso como percentual de uma
 *  âncora própria. O primeiro exercício do grupo dentro da janela ancora em
 *  100. Os que estreiam depois NÃO ancoram em 100: eles "nascem" valendo o
 *  índice vigente do grupo naquele instante — assim um exercício novo não
 *  derruba o índice ao entrar (imputar um valor igual à média não move a
 *  média) e sua linha já nasce numa altura comparável à dos demais.
 *
 *  O índice do grupo em cada dia é a média dos percentuais dos exercícios
 *  que já estrearam; quem não foi treinado no dia mantém o último valor.
 *
 *  A janela redefine o instante zero: as âncoras são sempre recalculadas
 *  a partir do início do intervalo selecionado.
 */
export function groupStrengthIndex(
  data: AppData,
  group: string,
  window: TimeWindow = null,
): IndexPoint[] {
  const groupOf = new Map(data.exercises.map((e) => [e.id, e.muscleGroup]));

  // 1. pontuação do dia (e1RM média) por exercício do grupo, dentro da janela
  type Entry = { t: number; track: string; score: number };
  const entries: Entry[] = [];
  for (const session of data.sessions) {
    const t = new Date(session.startedAt).getTime();
    if (!inWindow(t, window)) continue;
    for (const ex of session.exercises) {
      if (groupOf.get(ex.exerciseId) !== group) continue;
      const { score } = dayScore(ex);
      if (score > 0) entries.push({ t, track: trackKey(ex), score });
    }
  }
  entries.sort((a, b) => a.t - b.t);

  // 2. varre no tempo; pct = score × fator, com o fator definido na estreia
  const factor = new Map<string, number>();
  const pct = new Map<string, number>();
  const points: IndexPoint[] = [];

  let i = 0;
  while (i < entries.length) {
    const t = entries[i].t;
    const today: Entry[] = [];
    while (i < entries.length && entries[i].t === t) today.push(entries[i++]);

    // 2a. exercícios já conhecidos: atualiza o percentual
    for (const entry of today) {
      const f = factor.get(entry.track);
      if (f !== undefined) pct.set(entry.track, entry.score * f);
    }

    // 2b. estreias: ancoram no índice vigente do grupo
    for (const entry of today) {
      if (factor.has(entry.track)) continue;
      const current = pct.size > 0 ? average([...pct.values()]) : 100;
      factor.set(entry.track, current / entry.score);
      pct.set(entry.track, current);
    }

    points.push({ t, y: average([...pct.values()]) });
  }

  return points;
}
