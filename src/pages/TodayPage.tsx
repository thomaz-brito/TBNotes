import { Link } from "react-router-dom";
import { useData } from "../lib/data";
import { todayLabel } from "../lib/format";
import { IconChevronRight, IconRoutines, IconToday } from "../components/Icons";
import EmptyState from "../components/EmptyState";

export default function TodayPage() {
  const { data } = useData();

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Hoje</h1>
      </header>
      <p className="page-subtitle">{todayLabel()}</p>

      {data.routines.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<IconToday size={40} />}
            title="Comece montando seus treinos"
            text="Crie seus treinos na aba Treinos. Depois, é aqui que você vai iniciar a sessão do dia com tudo já preenchido."
          >
            <Link
              to="/treinos"
              className="btn btn-primary"
              style={{ marginTop: 16, textDecoration: "none" }}
            >
              Criar meu primeiro treino
            </Link>
          </EmptyState>
        </div>
      ) : (
        <>
          <p className="section-title">Iniciar a partir de um treino</p>
          <div className="list">
            {data.routines.map((r) => (
              <div key={r.id} className="list-row">
                <IconRoutines size={22} />
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
              </div>
            ))}
          </div>
          <p className="muted" style={{ fontSize: 14, textAlign: "center" }}>
            O registro da sessão do dia chega na próxima etapa — por enquanto,
            monte e ajuste seus treinos.
          </p>
        </>
      )}
    </div>
  );
}
