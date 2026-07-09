import { useRef, useState } from "react";
import { routineColor, useData } from "../lib/data";
import {
  addDays,
  dateKeyOfISO,
  dayLabel,
  dayLongLabel,
  dateKey,
  formatDateShort,
  monthLabel,
  todayKey,
} from "../lib/format";
import SessionCard from "../components/SessionCard";
import Sheet from "../components/Sheet";
import EmptyState from "../components/EmptyState";
import {
  IconChevronLeft,
  IconChevronRight,
  IconCopy,
  IconDumbbell,
  IconHistory,
  IconPlus,
  IconRoutines,
  IconToday,
} from "../components/Icons";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

export default function RecordsPage() {
  const { data, startSession, copySession, createEmptySession } = useData();
  const [day, setDay] = useState(todayKey());
  const [slideDir, setSlideDir] = useState<"left" | "right">("left");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calMonth, setCalMonth] = useState<{ year: number; month: number }>(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [startSheet, setStartSheet] = useState<null | "rotina" | "copiar">(null);

  // gesto de arrastar horizontal pra trocar de dia
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  function goTo(newDay: string) {
    setSlideDir(newDay > day ? "left" : "right");
    setDay(newDay);
  }

  const sessions = data.sessions
    .filter((s) => dateKeyOfISO(s.startedAt) === day)
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));

  const recentSessions = [...data.sessions]
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .slice(0, 15);

  // bolinhas do calendário: dia -> cores (uma por sessão, sem repetir cor)
  const dotsByDay = new Map<string, string[]>();
  for (const s of data.sessions) {
    const key = dateKeyOfISO(s.startedAt);
    const color = routineColor(data, s.routineId);
    const list = dotsByDay.get(key) ?? [];
    if (!list.includes(color)) list.push(color);
    dotsByDay.set(key, list);
  }

  function calendarCells(): Array<string | null> {
    const { year, month } = calMonth;
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<string | null> = Array(firstWeekday).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(dateKey(new Date(year, month, d)));
    }
    return cells;
  }

  function openCalendar() {
    const current = new Date(day + "T12:00:00");
    setCalMonth({ year: current.getFullYear(), month: current.getMonth() });
    setCalendarOpen(true);
  }

  function shiftMonth(delta: number) {
    setCalMonth(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  return (
    <div
      className="page"
      onTouchStart={(e) => {
        const touch = e.touches[0];
        if (touch) touchStart.current = { x: touch.clientX, y: touch.clientY };
      }}
      onTouchEnd={(e) => {
        const start = touchStart.current;
        touchStart.current = null;
        const touch = e.changedTouches[0];
        if (!start || !touch) return;
        const dx = touch.clientX - start.x;
        const dy = touch.clientY - start.y;
        if (Math.abs(dx) > 60 && Math.abs(dx) > 1.8 * Math.abs(dy)) {
          goTo(addDays(day, dx < 0 ? 1 : -1));
        }
      }}
    >
      <header className="page-header">
        <div>
          <h1 className="page-title">{dayLabel(day)}</h1>
          <p className="page-subtitle" style={{ margin: "2px 0 0" }}>
            {dayLongLabel(day)}
          </p>
        </div>
        <div className="row-gap" style={{ gap: 6 }}>
          <button
            className="icon-btn subtle"
            aria-label="Dia anterior"
            onClick={() => goTo(addDays(day, -1))}
          >
            <IconChevronLeft size={22} />
          </button>
          <button
            className="icon-btn subtle"
            aria-label="Próximo dia"
            onClick={() => goTo(addDays(day, 1))}
          >
            <IconChevronRight size={22} />
          </button>
          <button
            className="icon-btn"
            aria-label="Abrir calendário"
            onClick={openCalendar}
          >
            <IconHistory size={22} />
          </button>
        </div>
      </header>

      {day !== todayKey() && (
        <button
          className="btn btn-sm"
          style={{ marginBottom: 12 }}
          onClick={() => goTo(todayKey())}
        >
          <IconToday size={16} /> Voltar para hoje
        </button>
      )}

      <div key={day} className={`day-content slide-${slideDir}`}>
        {sessions.length === 0 ? (
          <>
            <div className="card">
              <EmptyState
                icon={<IconDumbbell size={40} />}
                title={
                  day === todayKey()
                    ? "Nenhum treino hoje ainda"
                    : "Nenhum treino neste dia"
                }
                text="Comece por um treino salvo, copie um treino anterior ou monte do zero."
              />
            </div>
            <button
              className="btn btn-primary btn-block"
              onClick={() => setStartSheet("rotina")}
            >
              <IconRoutines size={20} /> Usar treino salvo
            </button>
            <button
              className="btn btn-block"
              style={{ marginTop: 10 }}
              onClick={() => setStartSheet("copiar")}
            >
              <IconCopy size={20} /> Copiar treino anterior
            </button>
            <button
              className="btn btn-block"
              style={{ marginTop: 10 }}
              onClick={() => createEmptySession(day)}
            >
              <IconPlus size={20} /> Montar do zero
            </button>
          </>
        ) : (
          sessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))
        )}
      </div>

      {/* escolher treino salvo */}
      <Sheet
        open={startSheet === "rotina"}
        onClose={() => setStartSheet(null)}
        title="Usar treino salvo"
      >
        {data.routines.length === 0 ? (
          <p className="empty-text" style={{ textAlign: "center", padding: 16 }}>
            Você ainda não tem treinos salvos. Crie um na aba Treinos.
          </p>
        ) : (
          <div className="list">
            {data.routines.map((r) => (
              <button
                key={r.id}
                className="list-row"
                onClick={() => {
                  if (r.exercises.length === 0) {
                    window.alert(
                      "Este treino ainda não tem exercícios. Adicione na aba Treinos.",
                    );
                    return;
                  }
                  startSession(r.id, day);
                  setStartSheet(null);
                }}
              >
                <span
                  className="dot"
                  style={{ background: routineColor(data, r.id) }}
                />
                <div className="list-row-main">
                  <div className="list-row-title">{r.name}</div>
                  <div className="list-row-sub">
                    {r.exercises.length}{" "}
                    {r.exercises.length === 1 ? "exercício" : "exercícios"}
                  </div>
                </div>
                <span className="chevron">
                  <IconChevronRight size={20} />
                </span>
              </button>
            ))}
          </div>
        )}
      </Sheet>

      {/* copiar treino anterior */}
      <Sheet
        open={startSheet === "copiar"}
        onClose={() => setStartSheet(null)}
        title="Copiar treino anterior"
      >
        {recentSessions.length === 0 ? (
          <p className="empty-text" style={{ textAlign: "center", padding: 16 }}>
            Nenhum treino registrado ainda.
          </p>
        ) : (
          <div className="list">
            {recentSessions.map((s) => {
              const sets = s.exercises.reduce(
                (sum, ex) => sum + ex.sets.length,
                0,
              );
              return (
                <button
                  key={s.id}
                  className="list-row"
                  onClick={() => {
                    copySession(s.id, day);
                    setStartSheet(null);
                  }}
                >
                  <span
                    className="dot"
                    style={{ background: routineColor(data, s.routineId) }}
                  />
                  <div className="list-row-main">
                    <div className="list-row-title">{s.routineName}</div>
                    <div className="list-row-sub">
                      {formatDateShort(s.startedAt)} · {s.exercises.length}{" "}
                      exercícios · {sets} séries
                    </div>
                  </div>
                  <span className="chevron">
                    <IconChevronRight size={20} />
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </Sheet>

      {/* calendário mensal */}
      <Sheet open={calendarOpen} onClose={() => setCalendarOpen(false)}>
        <div className="cal-header">
          <button
            className="icon-btn subtle"
            aria-label="Mês anterior"
            onClick={() => shiftMonth(-1)}
          >
            <IconChevronLeft size={22} />
          </button>
          <span className="cal-title">
            {monthLabel(calMonth.year, calMonth.month)}
          </span>
          <button
            className="icon-btn subtle"
            aria-label="Próximo mês"
            onClick={() => shiftMonth(1)}
          >
            <IconChevronRight size={22} />
          </button>
        </div>
        <div className="cal-grid">
          {WEEKDAYS.map((w, i) => (
            <span key={i} className="cal-weekday">
              {w}
            </span>
          ))}
          {calendarCells().map((key, i) =>
            key === null ? (
              <span key={`pad-${i}`} />
            ) : (
              <button
                key={key}
                className={`cal-cell${key === todayKey() ? " today" : ""}${
                  key === day ? " selected" : ""
                }`}
                onClick={() => {
                  goTo(key);
                  setCalendarOpen(false);
                }}
              >
                <span>{Number(key.slice(8))}</span>
                <span className="cal-dots">
                  {(dotsByDay.get(key) ?? []).slice(0, 3).map((color, j) => (
                    <span key={j} className="dot" style={{ background: color }} />
                  ))}
                </span>
              </button>
            ),
          )}
        </div>
        <p className="muted" style={{ fontSize: 13, textAlign: "center", marginTop: 12 }}>
          Cada bolinha é um treino — a cor indica o template usado.
        </p>
      </Sheet>
    </div>
  );
}
