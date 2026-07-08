import EmptyState from "../components/EmptyState";
import { IconProgress } from "../components/Icons";

export default function ProgressPage() {
  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Progresso</h1>
      </header>
      <div className="card">
        <EmptyState
          icon={<IconProgress size={40} />}
          title="Seus gráficos vão aparecer aqui"
          text="Depois de registrar alguns treinos, você verá a evolução de carga e volume por exercício e por grupo muscular."
        />
      </div>
    </div>
  );
}
