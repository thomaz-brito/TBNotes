import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AppData, Exercise, Routine, Session, SessionExercise } from "./types";
import { supabase } from "./supabase";
import {
  fetchAll,
  replaceAll,
  routineToRow,
  saveExercises,
  saveSettings,
  sessionToRow,
} from "./cloud";
import { keyToDate, todayKey } from "./format";
import LoginScreen from "../components/LoginScreen";
import StatusScreen from "../components/StatusScreen";

// Camada de dados do app: estado em memória + escrita na nuvem (Supabase).
// As telas usam useData() e nunca falam com o banco diretamente.
// Edições rápidas (digitação) são agrupadas e salvas ~0,6s depois.

const EMPTY: AppData = {
  muscleGroups: [],
  setups: [],
  defaultSetup: null,
  exercises: [],
  routines: [],
  sessions: [],
};

type Phase = "boot" | "login" | "loading" | "waking" | "error" | "ready";

type DataContextValue = {
  data: AppData;
  userEmail: string | null;
  syncError: boolean;
  addMuscleGroup: (name: string) => void;
  addSetup: (name: string) => void;
  removeSetup: (name: string) => void;
  /** Renomeia um local e propaga para todos os treinos já rotulados. */
  renameSetup: (oldName: string, newName: string) => void;
  setDefaultSetup: (name: string | null) => void;
  /** Quantos treinos registrados ainda estão sem local. */
  countUnlabeled: () => number;
  /** Marca todos os treinos sem local com o local informado. */
  applySetupToUnlabeled: (name: string) => void;
  addExercise: (exercise: Omit<Exercise, "id">) => Exercise;
  updateExercise: (id: string, patch: Partial<Omit<Exercise, "id">>) => void;
  deleteExercise: (id: string) => void;
  addRoutine: (name: string) => Routine;
  updateRoutine: (id: string, update: (routine: Routine) => Routine) => void;
  deleteRoutine: (id: string) => void;
  duplicateRoutine: (id: string) => void;
  startSession: (routineId: string, dayKey: string) => Session | null;
  copySession: (sourceId: string, dayKey: string) => Session | null;
  createEmptySession: (dayKey: string) => Session;
  updateSession: (id: string, update: (session: Session) => Session) => void;
  deleteSession: (id: string) => void;
  logout: () => Promise<void>;
  exportBackup: () => void;
  importBackup: (file: File) => Promise<string | null>;
};

const DataContext = createContext<DataContextValue | null>(null);

function sessionStart(dayKey: string): string {
  return dayKey === todayKey()
    ? new Date().toISOString()
    : keyToDate(dayKey).toISOString();
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>("boot");
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [data, setData] = useState<AppData>(EMPTY);
  const [syncError, setSyncError] = useState(false);

  // espelho síncrono do estado (edições rápidas leem sempre o valor atual)
  const dataRef = useRef<AppData>(EMPTY);
  function commit(next: AppData) {
    dataRef.current = next;
    setData(next);
  }

  // fila de gravações com debounce (uma por chave, ex.: "routine:<id>")
  const pendingFns = useRef(new Map<string, () => Promise<unknown>>());
  const pendingTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  function run(fn: () => Promise<unknown>) {
    fn().then(
      () => setSyncError(false),
      () => setSyncError(true),
    );
  }

  function queue(key: string, fn: () => Promise<unknown>) {
    pendingFns.current.set(key, fn);
    const timer = pendingTimers.current.get(key);
    if (timer) clearTimeout(timer);
    pendingTimers.current.set(
      key,
      setTimeout(() => {
        pendingTimers.current.delete(key);
        const pending = pendingFns.current.get(key);
        pendingFns.current.delete(key);
        if (pending) run(pending);
      }, 600),
    );
  }

  function flushPending() {
    for (const timer of pendingTimers.current.values()) clearTimeout(timer);
    pendingTimers.current.clear();
    for (const fn of pendingFns.current.values()) run(fn);
    pendingFns.current.clear();
  }

  // salva o que estiver pendente se o app for pro fundo (troca de app, etc.)
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flushPending();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);

  async function load(uid: string) {
    setPhase("loading");
    for (let attempt = 1; attempt <= 12; attempt++) {
      try {
        const loaded = await fetchAll(uid);
        commit(loaded);
        setPhase("ready");
        return;
      } catch {
        // plano gratuito hiberna após ~7 dias sem uso e leva alguns
        // segundos pra acordar — seguimos tentando com aviso amigável
        setPhase("waking");
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
    setPhase("error");
  }

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session?.user) {
        setUserId(session.user.id);
        setUserEmail(session.user.email ?? null);
        load(session.user.id);
      } else {
        setPhase("login");
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(email: string, password: string): Promise<string | null> {
    const { data: res, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        return "E-mail ou senha incorretos.";
      }
      if (error.message.includes("Email not confirmed")) {
        return "E-mail ainda não confirmado. Confira sua caixa de entrada.";
      }
      return "Não foi possível conectar. Verifique sua internet e tente de novo.";
    }
    setUserId(res.user.id);
    setUserEmail(res.user.email ?? null);
    load(res.user.id);
    return null;
  }

  const uid = () => userId!; // só usado com phase === "ready" (logado)

  /** Aplica um novo estado de configurações e agenda a gravação. */
  function saveSettingsPatch(next: AppData) {
    commit(next);
    queue("settings", () => saveSettings(uid(), next));
  }

  /** Reescreve em lote as sessões que casarem com o filtro (e só elas). */
  function rewriteSessions(
    match: (session: Session) => boolean,
    mapExercise: (ex: SessionExercise) => SessionExercise,
  ) {
    const d = dataRef.current;
    const changed = d.sessions
      .filter(match)
      .map((s) => ({ ...s, exercises: s.exercises.map(mapExercise) }));
    if (changed.length === 0) return;

    const byId = new Map(changed.map((s) => [s.id, s]));
    commit({ ...d, sessions: d.sessions.map((s) => byId.get(s.id) ?? s) });

    run(async () => {
      for (const session of changed) {
        const { error } = await supabase
          .from("sessions")
          .upsert(sessionToRow(uid(), session));
        if (error) throw error;
      }
    });
  }

  const value: DataContextValue = {
    data,
    userEmail,
    syncError,

    addMuscleGroup(name) {
      const d = dataRef.current;
      if (d.muscleGroups.includes(name)) return;
      saveSettingsPatch({ ...d, muscleGroups: [...d.muscleGroups, name] });
    },

    addSetup(name) {
      const d = dataRef.current;
      const value = name.trim();
      if (!value || d.setups.includes(value)) return;
      saveSettingsPatch({
        ...d,
        setups: [...d.setups, value],
        // o primeiro local cadastrado já vira o padrão
        defaultSetup: d.defaultSetup ?? value,
      });
    },

    removeSetup(name) {
      const d = dataRef.current;
      saveSettingsPatch({
        ...d,
        setups: d.setups.filter((s) => s !== name),
        defaultSetup: d.defaultSetup === name ? null : d.defaultSetup,
      });
    },

    setDefaultSetup(name) {
      const d = dataRef.current;
      saveSettingsPatch({ ...d, defaultSetup: name });
    },

    renameSetup(oldName, newName) {
      const d = dataRef.current;
      const value = newName.trim();
      if (!value || value === oldName || d.setups.includes(value)) return;

      // 1. lista de locais e padrão
      const next: AppData = {
        ...d,
        setups: d.setups.map((s) => (s === oldName ? value : s)),
        defaultSetup: d.defaultSetup === oldName ? value : d.defaultSetup,
      };
      commit(next);
      queue("settings", () => saveSettings(uid(), next));

      // 2. propaga para todos os treinos já rotulados com o nome antigo
      rewriteSessions(
        (s) => s.exercises.some((ex) => ex.setup === oldName),
        (ex) => (ex.setup === oldName ? { ...ex, setup: value } : ex),
      );
    },

    countUnlabeled() {
      return dataRef.current.sessions.filter((s) =>
        s.exercises.some((ex) => !ex.setup),
      ).length;
    },

    applySetupToUnlabeled(name) {
      rewriteSessions(
        (s) => s.exercises.some((ex) => !ex.setup),
        (ex) => (ex.setup ? ex : { ...ex, setup: name }),
      );
    },

    addExercise(exercise) {
      const created: Exercise = { ...exercise, id: crypto.randomUUID() };
      const d = dataRef.current;
      commit({ ...d, exercises: [...d.exercises, created] });
      run(() => saveExercises(uid(), [created]));
      return created;
    },

    updateExercise(id, patch) {
      const d = dataRef.current;
      const exercises = d.exercises.map((e) =>
        e.id === id ? { ...e, ...patch } : e,
      );
      commit({ ...d, exercises });
      const changed = exercises.find((e) => e.id === id);
      if (!changed) return;
      queue(`exercise:${id}`, () => saveExercises(uid(), [changed]));
    },

    deleteExercise(id) {
      const d = dataRef.current;
      const affected = d.routines.filter((r) =>
        r.exercises.some((re) => re.exerciseId === id),
      );
      const routines = d.routines.map((r) => ({
        ...r,
        exercises: r.exercises.filter((re) => re.exerciseId !== id),
      }));
      commit({
        ...d,
        exercises: d.exercises.filter((e) => e.id !== id),
        routines,
      });
      run(async () => {
        const { error } = await supabase.from("exercises").delete().eq("id", id);
        if (error) throw error;
      });
      for (const original of affected) {
        const changed = routines.find((r) => r.id === original.id);
        if (changed) {
          queue(`routine:${changed.id}`, async () => {
            const { error } = await supabase
              .from("routines")
              .upsert(routineToRow(uid(), changed));
            if (error) throw error;
          });
        }
      }
    },

    addRoutine(name) {
      const now = new Date().toISOString();
      const routine: Routine = {
        id: crypto.randomUUID(),
        name,
        exercises: [],
        createdAt: now,
        updatedAt: now,
      };
      const d = dataRef.current;
      commit({ ...d, routines: [...d.routines, routine] });
      run(async () => {
        const { error } = await supabase
          .from("routines")
          .insert(routineToRow(uid(), routine));
        if (error) throw error;
      });
      return routine;
    },

    updateRoutine(id, update) {
      const d = dataRef.current;
      const routines = d.routines.map((r) =>
        r.id === id ? { ...update(r), updatedAt: new Date().toISOString() } : r,
      );
      commit({ ...d, routines });
      const changed = routines.find((r) => r.id === id);
      if (!changed) return;
      queue(`routine:${id}`, async () => {
        const { error } = await supabase
          .from("routines")
          .upsert(routineToRow(uid(), changed));
        if (error) throw error;
      });
    },

    deleteRoutine(id) {
      const d = dataRef.current;
      commit({ ...d, routines: d.routines.filter((r) => r.id !== id) });
      run(async () => {
        const { error } = await supabase.from("routines").delete().eq("id", id);
        if (error) throw error;
      });
    },

    duplicateRoutine(id) {
      const d = dataRef.current;
      const original = d.routines.find((r) => r.id === id);
      if (!original) return;
      const now = new Date().toISOString();
      const copy: Routine = {
        ...original,
        id: crypto.randomUUID(),
        name: `${original.name} (cópia)`,
        exercises: original.exercises.map((re) => ({
          ...re,
          id: crypto.randomUUID(),
          sets: re.sets.map((s) => ({ ...s, id: crypto.randomUUID() })),
        })),
        createdAt: now,
        updatedAt: now,
      };
      commit({ ...d, routines: [...d.routines, copy] });
      run(async () => {
        const { error } = await supabase
          .from("routines")
          .insert(routineToRow(uid(), copy));
        if (error) throw error;
      });
    },

    startSession(routineId, dayKey) {
      const d = dataRef.current;
      const routine = d.routines.find((r) => r.id === routineId);
      if (!routine) return null;

      const startedAt = sessionStart(dayKey);
      const exercises: SessionExercise[] = routine.exercises.map((re) => ({
        id: crypto.randomUUID(),
        exerciseId: re.exerciseId,
        variation: re.variation,
        setup: d.defaultSetup,
        restSeconds: re.restSeconds,
        sets: re.sets.map((s) => ({
          id: crypto.randomUUID(),
          reps: s.reps,
          weight: s.weight,
          done: false,
          failure: false,
        })),
      }));

      const session: Session = {
        id: crypto.randomUUID(),
        routineId,
        routineName: routine.name,
        startedAt,
        finishedAt: startedAt,
        exercises,
      };
      commit({ ...d, sessions: [...d.sessions, session] });
      run(async () => {
        const { error } = await supabase
          .from("sessions")
          .insert(sessionToRow(uid(), session));
        if (error) throw error;
      });
      return session;
    },

    copySession(sourceId, dayKey) {
      const d = dataRef.current;
      const source = d.sessions.find((s) => s.id === sourceId);
      if (!source) return null;

      const startedAt = sessionStart(dayKey);
      const session: Session = {
        id: crypto.randomUUID(),
        routineId: source.routineId,
        routineName: source.routineName,
        startedAt,
        finishedAt: startedAt,
        exercises: source.exercises.map((se) => ({
          ...se,
          id: crypto.randomUUID(),
          // mantém reps, cargas e marcações de falha da sessão copiada
          sets: se.sets.map((s) => ({
            ...s,
            id: crypto.randomUUID(),
            done: false,
          })),
        })),
      };
      commit({ ...d, sessions: [...d.sessions, session] });
      run(async () => {
        const { error } = await supabase
          .from("sessions")
          .insert(sessionToRow(uid(), session));
        if (error) throw error;
      });
      return session;
    },

    createEmptySession(dayKey) {
      const startedAt = sessionStart(dayKey);
      const session: Session = {
        id: crypto.randomUUID(),
        routineId: null,
        routineName: "Treino avulso",
        startedAt,
        finishedAt: startedAt,
        exercises: [],
      };
      const d = dataRef.current;
      commit({ ...d, sessions: [...d.sessions, session] });
      run(async () => {
        const { error } = await supabase
          .from("sessions")
          .insert(sessionToRow(uid(), session));
        if (error) throw error;
      });
      return session;
    },

    updateSession(id, update) {
      const d = dataRef.current;
      const sessions = d.sessions.map((s) => (s.id === id ? update(s) : s));
      commit({ ...d, sessions });
      const changed = sessions.find((s) => s.id === id);
      if (!changed) return;
      queue(`session:${id}`, async () => {
        const { error } = await supabase
          .from("sessions")
          .upsert(sessionToRow(uid(), changed));
        if (error) throw error;
      });
    },

    deleteSession(id) {
      const d = dataRef.current;
      commit({ ...d, sessions: d.sessions.filter((s) => s.id !== id) });
      run(async () => {
        const { error } = await supabase.from("sessions").delete().eq("id", id);
        if (error) throw error;
      });
    },

    async logout() {
      flushPending();
      await supabase.auth.signOut();
      commit(EMPTY);
      setUserId(null);
      setUserEmail(null);
      setPhase("login");
    },

    exportBackup() {
      const blob = new Blob([JSON.stringify(dataRef.current, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tbnotes-backup-${todayKey()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },

    async importBackup(file) {
      try {
        const parsed = JSON.parse(await file.text()) as AppData;
        if (
          !Array.isArray(parsed.exercises) ||
          !Array.isArray(parsed.routines) ||
          !Array.isArray(parsed.sessions) ||
          !Array.isArray(parsed.muscleGroups)
        ) {
          return "Arquivo inválido: não parece um backup do TBNotes.";
        }
        flushPending();
        await replaceAll(uid(), parsed);
        commit(parsed);
        return null;
      } catch {
        return "Não foi possível importar. Verifique o arquivo e sua conexão.";
      }
    },
  };

  if (phase === "boot") {
    return <StatusScreen spinner title="Abrindo o TBNotes…" />;
  }
  if (phase === "login") {
    return <LoginScreen onLogin={login} />;
  }
  if (phase === "loading") {
    return <StatusScreen spinner title="Carregando seus treinos…" />;
  }
  if (phase === "waking") {
    return (
      <StatusScreen
        spinner
        title="Acordando o banco de dados…"
        text="O plano gratuito hiberna depois de alguns dias sem uso. Isso leva só alguns segundos — continuamos tentando."
      />
    );
  }
  if (phase === "error") {
    return (
      <StatusScreen
        title="Não foi possível conectar"
        text="Verifique sua internet. Se o problema continuar, o projeto no Supabase pode estar pausado — abra o painel em supabase.com e clique em Restore."
        actionLabel="Tentar novamente"
        onAction={() => userId && load(userId)}
      />
    );
  }

  return (
    <DataContext.Provider value={value}>
      {syncError && (
        <div className="sync-banner">
          Sem conexão — as últimas alterações ainda não foram salvas.
        </div>
      )}
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData deve ser usado dentro de <DataProvider>");
  return ctx;
}

/** Ordena os grupos musculares na ordem da lista de grupos do app. */
export function groupOrder(data: AppData): string[] {
  const extras = [
    ...new Set(
      data.exercises
        .map((e) => e.muscleGroup)
        .filter((g) => !data.muscleGroups.includes(g)),
    ),
  ];
  return [...data.muscleGroups, ...extras];
}

/** Paleta de cores dos templates (bolinhas do calendário). */
const ROUTINE_COLORS = [
  "#10b981", // verde
  "#3b82f6", // azul
  "#f59e0b", // âmbar
  "#ec4899", // rosa
  "#8b5cf6", // roxo
  "#ef4444", // vermelho
  "#14b8a6", // teal
  "#f97316", // laranja
];

const MANUAL_COLOR = "#9ca3af"; // cinza: treino avulso ou template removido

/** Cor associada a um template de treino (cinza para treinos avulsos). */
export function routineColor(data: AppData, routineId: string | null): string {
  if (!routineId) return MANUAL_COLOR;
  const index = data.routines.findIndex((r) => r.id === routineId);
  if (index === -1) return MANUAL_COLOR;
  return ROUTINE_COLORS[index % ROUTINE_COLORS.length];
}

/** Nome de exibição de um exercício + variação, ex.: "Supino · Inclinado (barra)". */
export function displayName(
  data: AppData,
  exerciseId: string,
  variation: string | null,
): string {
  const exercise = data.exercises.find((e) => e.id === exerciseId);
  if (!exercise) return "Exercício removido";
  return variation ? `${exercise.name} · ${variation}` : exercise.name;
}

/** Observação da variação usada num exercício da sessão/treino (se houver). */
export function variationNotes(
  data: AppData,
  exerciseId: string,
  variation: string | null,
): string | undefined {
  if (!variation) return undefined;
  const exercise = data.exercises.find((e) => e.id === exerciseId);
  return exercise?.variations.find((v) => v.name === variation)?.notes;
}
