import EmptyState from "../components/EmptyState";
import { IconHistory } from "../components/Icons";

export default function HistoryPage() {
  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Histórico</h1>
      </header>
      <div className="card">
        <EmptyState
          icon={<IconHistory size={40} />}
          title="Nenhum treino registrado ainda"
          text="Quando você registrar suas sessões, elas vão aparecer aqui organizadas por data."
        />
      </div>
    </div>
  );
}
