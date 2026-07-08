import type { AppData, Exercise } from "./types";

// Biblioteca inicial de exercícios — você pode editar e ampliar pelo app.

const GROUPS = [
  "Peito",
  "Costas",
  "Ombros",
  "Bíceps",
  "Tríceps",
  "Quadríceps",
  "Posterior de coxa",
  "Glúteos",
  "Panturrilha",
  "Abdômen",
];

const EXERCISES: Array<[string, string]> = [
  ["Supino reto (barra)", "Peito"],
  ["Supino inclinado (halteres)", "Peito"],
  ["Crucifixo (máquina)", "Peito"],
  ["Flexão de braço", "Peito"],
  ["Puxada frente (pulley)", "Costas"],
  ["Remada curvada (barra)", "Costas"],
  ["Remada baixa (cabo)", "Costas"],
  ["Barra fixa", "Costas"],
  ["Desenvolvimento (halteres)", "Ombros"],
  ["Elevação lateral", "Ombros"],
  ["Elevação frontal", "Ombros"],
  ["Crucifixo inverso", "Ombros"],
  ["Rosca direta (barra)", "Bíceps"],
  ["Rosca alternada (halteres)", "Bíceps"],
  ["Rosca martelo", "Bíceps"],
  ["Tríceps pulley (corda)", "Tríceps"],
  ["Tríceps testa", "Tríceps"],
  ["Mergulho no banco", "Tríceps"],
  ["Agachamento livre", "Quadríceps"],
  ["Leg press", "Quadríceps"],
  ["Cadeira extensora", "Quadríceps"],
  ["Afundo", "Quadríceps"],
  ["Mesa flexora", "Posterior de coxa"],
  ["Stiff", "Posterior de coxa"],
  ["Elevação pélvica (hip thrust)", "Glúteos"],
  ["Cadeira abdutora", "Glúteos"],
  ["Panturrilha em pé", "Panturrilha"],
  ["Panturrilha sentado", "Panturrilha"],
  ["Abdominal na polia", "Abdômen"],
  ["Prancha", "Abdômen"],
  ["Elevação de pernas", "Abdômen"],
];

export function createSeedData(): AppData {
  const exercises: Exercise[] = EXERCISES.map(([name, muscleGroup]) => ({
    id: crypto.randomUUID(),
    name,
    muscleGroup,
  }));

  return {
    muscleGroups: GROUPS,
    exercises,
    routines: [],
  };
}
