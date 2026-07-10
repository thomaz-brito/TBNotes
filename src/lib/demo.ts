import type { AppData, Routine, Session, SessionExercise } from "./types";

// Dados fictícios de demonstração: 8 semanas de treino Push/Pull/Legs,
// com progressão crível por exercício (ritmos diferentes por grupo,
// flutuação do dia a dia, platôs) pra avaliar os gráficos com conteúdo real.
// Serão substituídos pelos seus dados de verdade — é só excluir os treinos.

/** Gerador pseudo-aleatório determinístico (mesmos dados a cada geração). */
function makeRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

type Spec = {
  exercise: string; // nome na biblioteca
  variation: string;
  start: number; // carga no início das 8 semanas
  end: number; // carga ao fim
  step: number; // incremento real do equipamento
  sets: number;
  baseReps: number;
  /** Trecho da linha do tempo (0..1) em que a carga estaciona. */
  plateau?: [number, number];
};

const PUSH: Spec[] = [
  { exercise: "Supino", variation: "Reto (barra)", start: 60, end: 70, step: 2.5, sets: 4, baseReps: 8 },
  { exercise: "Desenvolvimento", variation: "Halteres (sentado)", start: 20, end: 24, step: 2, sets: 3, baseReps: 10, plateau: [0.4, 0.75] },
  { exercise: "Crucifixo", variation: "Máquina (peck deck)", start: 45, end: 55, step: 5, sets: 3, baseReps: 12 },
  { exercise: "Tríceps na polia", variation: "Corda", start: 25, end: 30, step: 2.5, sets: 3, baseReps: 12 },
];

const PULL: Spec[] = [
  { exercise: "Puxada", variation: "Frente (pegada aberta)", start: 55, end: 65, step: 2.5, sets: 4, baseReps: 10 },
  { exercise: "Remada", variation: "Curvada (barra, pronada)", start: 50, end: 60, step: 2.5, sets: 4, baseReps: 8 },
  { exercise: "Rosca direta", variation: "Barra W", start: 20, end: 23, step: 1, sets: 3, baseReps: 10, plateau: [0.5, 0.85] },
  { exercise: "Face pull", variation: "Polia (corda)", start: 15, end: 20, step: 2.5, sets: 3, baseReps: 14 },
];

const LEGS: Spec[] = [
  { exercise: "Agachamento", variation: "Livre (barra)", start: 70, end: 90, step: 2.5, sets: 4, baseReps: 8 },
  { exercise: "Leg press", variation: "45°", start: 140, end: 180, step: 10, sets: 4, baseReps: 10 },
  { exercise: "Flexora", variation: "Mesa (deitado)", start: 35, end: 45, step: 5, sets: 3, baseReps: 12 },
  { exercise: "Elevação pélvica (hip thrust)", variation: "Barra", start: 80, end: 105, step: 5, sets: 3, baseReps: 10 },
  { exercise: "Panturrilha em pé", variation: "Máquina", start: 60, end: 75, step: 5, sets: 4, baseReps: 12 },
];

/** daysAgo de cada sessão, semana a semana (frequência varia; dias pulados). */
const SCHEDULE: Array<[number, "push" | "pull" | "legs"]> = [
  [55, "push"], [53, "pull"], [51, "legs"], [49, "push"],
  [47, "pull"], [45, "legs"], [43, "push"],
  [41, "pull"], [39, "legs"], [37, "push"], [35, "pull"],
  [33, "legs"], [31, "push"], [29, "pull"],
  [27, "legs"], [24, "push"], [22, "pull"], // semana fraca (viagem)
  [20, "legs"], [18, "push"], [16, "pull"], [14, "legs"],
  [13, "push"], [11, "pull"], [9, "legs"], [7, "push"],
  [6, "pull"], [4, "legs"], [2, "push"],
];

const TOTAL_DAYS = 55;

export function buildDemoData(base: AppData): AppData {
  const rnd = makeRng(42);

  function findExercise(name: string) {
    const found = base.exercises.find((e) => e.name === name);
    if (!found) throw new Error(`Exercício do demo não encontrado: ${name}`);
    return found;
  }

  function weightAt(spec: Spec, progress: number): number {
    let p = progress;
    if (spec.plateau) {
      const [a, b] = spec.plateau;
      if (p > a && p < b) p = a; // estaciona
      else if (p >= b) p = a + (p - b) * ((1 - a) / (1 - b)); // retoma
    }
    const nominal = spec.start + (spec.end - spec.start) * p;
    // flutuação do dia a dia: às vezes um passo abaixo, raramente um acima
    const roll = rnd();
    const jitter = roll < 0.22 ? -spec.step : roll > 0.93 ? spec.step : 0;
    const value = Math.round((nominal + jitter) / spec.step) * spec.step;
    return Math.max(spec.step, value);
  }

  function buildExercise(spec: Spec, progress: number): SessionExercise {
    const weight = weightAt(spec, progress);
    const sets = [];
    for (let i = 0; i < spec.sets; i++) {
      const fatigue = i === 0 ? 0 : Math.floor(rnd() * (i + 1));
      const reps = Math.max(4, spec.baseReps + Math.round(rnd() * 2) - 1 - fatigue);
      const isLast = i === spec.sets - 1;
      sets.push({
        id: crypto.randomUUID(),
        reps,
        weight,
        done: true,
        failure: isLast && rnd() < 0.4,
      });
    }
    return {
      id: crypto.randomUUID(),
      exerciseId: findExercise(spec.exercise).id,
      variation: spec.variation,
      restSeconds: 90,
      sets,
    };
  }

  const plans: Record<"push" | "pull" | "legs", { name: string; specs: Spec[] }> = {
    push: { name: "A - Push", specs: PUSH },
    pull: { name: "B - Pull", specs: PULL },
    legs: { name: "C - Legs", specs: LEGS },
  };

  // treinos salvos (templates), com as cargas atuais como padrão
  const routines: Routine[] = (["push", "pull", "legs"] as const).map((key) => {
    const plan = plans[key];
    const now = new Date().toISOString();
    return {
      id: crypto.randomUUID(),
      name: plan.name,
      createdAt: now,
      updatedAt: now,
      exercises: plan.specs.map((spec) => ({
        id: crypto.randomUUID(),
        exerciseId: findExercise(spec.exercise).id,
        variation: spec.variation,
        restSeconds: 90,
        sets: Array.from({ length: spec.sets }, () => ({
          id: crypto.randomUUID(),
          reps: spec.baseReps,
          weight: spec.end,
        })),
      })),
    };
  });

  const routineIdByType = {
    push: routines[0].id,
    pull: routines[1].id,
    legs: routines[2].id,
  };

  const sessions: Session[] = SCHEDULE.map(([daysAgo, type]) => {
    const plan = plans[type];
    const progress = (TOTAL_DAYS - daysAgo) / TOTAL_DAYS;
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    date.setHours(18, 30, 0, 0);
    const iso = date.toISOString();
    return {
      id: crypto.randomUUID(),
      routineId: routineIdByType[type],
      routineName: plan.name,
      startedAt: iso,
      finishedAt: iso,
      exercises: plan.specs.map((spec) => buildExercise(spec, progress)),
    };
  });

  return { ...base, routines, sessions };
}
