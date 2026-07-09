export function formatWeight(kg: number): string {
  return `${kg.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg`;
}

export function todayLabel(): string {
  const label = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** "1:30" a partir de segundos. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function formatRest(seconds: number): string {
  return seconds > 0 ? formatClock(seconds) : "sem descanso";
}

/** "Qua, 08/07" a partir de uma data ISO. */
export function formatDateShort(iso: string): string {
  const label = new Date(iso).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatTimeOfDay(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------- dias (a aba Registros navega por "chaves de dia" YYYY-MM-DD) ----------

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function todayKey(): string {
  return dateKey(new Date());
}

export function dateKeyOfISO(iso: string): string {
  return dateKey(new Date(iso));
}

/** Converte a chave do dia numa data (meio-dia local, evita virada de fuso). */
export function keyToDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

export function addDays(key: string, delta: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return dateKey(new Date(y, m - 1, d + delta));
}

/** "Hoje", "Ontem", "Amanhã" ou "Qui., 03/07". */
export function dayLabel(key: string): string {
  const today = todayKey();
  if (key === today) return "Hoje";
  if (key === addDays(today, -1)) return "Ontem";
  if (key === addDays(today, 1)) return "Amanhã";
  return formatDateShort(keyToDate(key).toISOString());
}

/** "Quinta-feira, 3 de julho" para a chave do dia. */
export function dayLongLabel(key: string): string {
  const label = keyToDate(key).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function monthLabel(year: number, month: number): string {
  const label = new Date(year, month, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}
