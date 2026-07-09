import { useNavigate } from "react-router-dom";
import { useData } from "../lib/data";
import { formatDateShort, formatTimeOfDay, formatWeight } from "../lib/format";
import EmptyState from "../components/EmptyState";
import { IconChevronRight, IconHistory } from "../components/Icons";
import type { Session } from "../lib/types";

function sessionVolume(session: Session): number {
  return session.exercises.reduce(
    (sum, ex) =>
      sum +
      ex.sets.reduce((s, set) => s + (set.done ? set.reps * set.weight : 0), 0),
    0,
  );
}

export default function HistoryPage() {
  const { data } = useData();
  const navigate = useNavigate();

  const finished = [...data.sessions]
    .filter((s) => s.finishedAt)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Histórico</h1>
      </header>

      {finished.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<IconHistory size={40} />}
            title="Nenhum treino registrado ainda"
            text="Inicie uma sessão na aba Hoje. Quando você concluir, ela aparece aqui."
          />
        </div>
      ) : (
        <div className="list">
          {finished.map((session) => {
            const sets = session.exercises.reduce(
              (sum, ex) => sum + ex.sets.filter((s) => s.done).length,
              0,
            );
            const volume = sessionVolume(session);
            return (
              <button
                key={session.id}
                className="list-row"
                onClick={() => navigate(`/sessao/${session.id}`)}
              >
                <div className="list-row-main">
                  <div className="list-row-title">{session.routineName}</div>
                  <div className="list-row-sub">
                    {formatDateShort(session.startedAt)} ·{" "}
                    {formatTimeOfDay(session.startedAt)} · {sets} séries
                    {volume > 0 && <> · {formatWeight(volume)}</>}
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
    </div>
  );
}
