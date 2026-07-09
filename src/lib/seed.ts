import type { AppData, Exercise } from "./types";

// Biblioteca inicial de exercícios — você pode editar e ampliar pelo app.
// Formato: [nome, grupo muscular, variações]

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

const EXERCISES: Array<[string, string, string[]]> = [
  // ---------- Peito ----------
  [
    "Supino",
    "Peito",
    [
      "Reto (barra)",
      "Reto (halteres)",
      "Reto (máquina)",
      "Inclinado (barra)",
      "Inclinado (halteres)",
      "Inclinado (máquina)",
      "Declinado (barra)",
      "Declinado (halteres)",
      "No Smith",
    ],
  ],
  [
    "Crucifixo",
    "Peito",
    [
      "Reto (halteres)",
      "Inclinado (halteres)",
      "Máquina (peck deck)",
      "Crossover (polia alta)",
      "Crossover (polia média)",
      "Crossover (polia baixa)",
    ],
  ],
  [
    "Flexão de braço",
    "Peito",
    ["Tradicional", "Inclinada (mãos elevadas)", "Declinada (pés elevados)", "Diamante", "Com peso nas costas"],
  ],
  ["Paralelas (peito)", "Peito", ["Peso do corpo", "Com peso", "Máquina assistida"]],
  ["Pullover", "Peito", ["Halter", "Polia (cabo)"]],

  // ---------- Costas ----------
  [
    "Puxada",
    "Costas",
    [
      "Frente (pegada aberta)",
      "Frente (pegada fechada / triângulo)",
      "Frente (pegada supinada)",
      "Atrás da nuca",
      "Unilateral (polia)",
    ],
  ],
  [
    "Barra fixa",
    "Costas",
    ["Pegada aberta", "Pegada fechada", "Supinada (chin-up)", "Com peso", "Assistida (máquina/elástico)"],
  ],
  [
    "Remada",
    "Costas",
    [
      "Curvada (barra, pronada)",
      "Curvada (barra, supinada)",
      "Unilateral (halter / serrote)",
      "Baixa (polia, triângulo)",
      "Cavalinho (T-bar)",
      "Máquina (apoiada)",
      "Alta (polia)",
    ],
  ],
  ["Levantamento terra", "Costas", ["Convencional", "Sumô", "Com trap bar"]],
  ["Pulldown com braços estendidos", "Costas", ["Polia (barra reta)", "Polia (corda)"]],
  ["Hiperextensão lombar", "Costas", ["Banco romano", "Com peso"]],

  // ---------- Ombros ----------
  [
    "Desenvolvimento",
    "Ombros",
    ["Halteres (sentado)", "Halteres (em pé)", "Barra (militar)", "Máquina", "Arnold press", "No Smith"],
  ],
  ["Elevação lateral", "Ombros", ["Halteres", "Polia (cabo)", "Máquina", "Inclinado (halter)"]],
  ["Elevação frontal", "Ombros", ["Halteres", "Barra", "Polia (cabo)", "Anilha"]],
  [
    "Crucifixo inverso",
    "Ombros",
    ["Halteres (curvado)", "Máquina (peck deck inverso)", "Polia (cabo cruzado)"],
  ],
  ["Face pull", "Ombros", ["Polia (corda)"]],
  ["Encolhimento", "Ombros", ["Halteres", "Barra", "No Smith"]],
  ["Remada alta", "Ombros", ["Barra", "Halteres", "Polia (cabo)"]],

  // ---------- Bíceps ----------
  ["Rosca direta", "Bíceps", ["Barra reta", "Barra W", "Polia (cabo)", "Halteres"]],
  [
    "Rosca alternada",
    "Bíceps",
    ["Halteres (em pé)", "Halteres (sentado)", "Banco inclinado"],
  ],
  ["Rosca martelo", "Bíceps", ["Halteres", "Polia (corda)", "Banco inclinado"]],
  ["Rosca concentrada", "Bíceps", ["Halter"]],
  ["Rosca Scott", "Bíceps", ["Barra W", "Halter (unilateral)", "Máquina"]],
  ["Rosca inversa", "Bíceps", ["Barra", "Polia (cabo)"]],

  // ---------- Tríceps ----------
  [
    "Tríceps na polia",
    "Tríceps",
    ["Barra reta", "Corda", "Barra V", "Unilateral (pegada invertida)"],
  ],
  ["Tríceps testa", "Tríceps", ["Barra W", "Halteres", "Polia (cabo)"]],
  [
    "Tríceps francês",
    "Tríceps",
    ["Halter (duas mãos)", "Halter (unilateral)", "Polia (corda, acima da cabeça)"],
  ],
  ["Mergulho (tríceps)", "Tríceps", ["Banco", "Paralelas", "Máquina"]],
  ["Coice (kickback)", "Tríceps", ["Halter", "Polia (cabo)"]],
  ["Supino fechado", "Tríceps", ["Barra", "No Smith"]],

  // ---------- Quadríceps ----------
  [
    "Agachamento",
    "Quadríceps",
    [
      "Livre (barra)",
      "Frontal (barra)",
      "No Smith",
      "Goblet (halter)",
      "Hack (máquina)",
      "Búlgaro (pé elevado)",
      "Sumô (halter)",
    ],
  ],
  ["Leg press", "Quadríceps", ["45°", "Horizontal", "Unilateral"]],
  ["Cadeira extensora", "Quadríceps", ["Bilateral", "Unilateral"]],
  ["Afundo", "Quadríceps", ["Halteres", "Barra", "Caminhando", "No Smith"]],
  ["Subida no banco (step-up)", "Quadríceps", ["Peso do corpo", "Halteres", "Barra"]],

  // ---------- Posterior de coxa ----------
  [
    "Flexora",
    "Posterior de coxa",
    ["Mesa (deitado)", "Cadeira (sentado)", "Em pé (unilateral)"],
  ],
  ["Stiff", "Posterior de coxa", ["Barra", "Halteres"]],
  ["Levantamento terra romeno", "Posterior de coxa", ["Barra", "Halteres"]],
  ["Bom dia", "Posterior de coxa", ["Barra"]],
  ["Nordic curl", "Posterior de coxa", ["Peso do corpo", "Assistido"]],

  // ---------- Glúteos ----------
  [
    "Elevação pélvica (hip thrust)",
    "Glúteos",
    ["Barra", "Máquina", "Unilateral", "Peso do corpo"],
  ],
  ["Abdução de quadril", "Glúteos", ["Máquina (cadeira abdutora)", "Polia (cabo)", "Elástico"]],
  ["Coice de glúteo", "Glúteos", ["Polia (cabo)", "Máquina", "Solo (4 apoios)"]],
  ["Adução de quadril", "Glúteos", ["Máquina (cadeira adutora)", "Polia (cabo)"]],

  // ---------- Panturrilha ----------
  [
    "Panturrilha em pé",
    "Panturrilha",
    ["Máquina", "No Smith", "Livre (halteres)", "Unilateral (degrau)"],
  ],
  ["Panturrilha sentado", "Panturrilha", ["Máquina"]],
  ["Panturrilha no leg press", "Panturrilha", ["45°", "Horizontal"]],

  // ---------- Abdômen ----------
  [
    "Abdominal",
    "Abdômen",
    [
      "Solo (crunch)",
      "Máquina",
      "Polia (ajoelhado)",
      "Banco declinado",
      "Infra (solo)",
      "Infra (banco)",
    ],
  ],
  ["Prancha", "Abdômen", ["Frontal", "Lateral", "Com peso"]],
  [
    "Elevação de pernas",
    "Abdômen",
    ["Barra fixa (pendurado)", "Paralelas (apoio)", "Solo"],
  ],
  [
    "Oblíquos",
    "Abdômen",
    ["Rotação russa", "Inclinação lateral (halter)", "Lenhador (polia)"],
  ],
  ["Roda abdominal", "Abdômen", ["Ajoelhado", "Em pé"]],
];

export function createSeedData(): AppData {
  const exercises: Exercise[] = EXERCISES.map(([name, muscleGroup, variations]) => ({
    id: crypto.randomUUID(),
    name,
    muscleGroup,
    variations,
  }));

  return {
    muscleGroups: GROUPS,
    exercises,
    routines: [],
    sessions: [],
  };
}
