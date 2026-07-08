import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "../lib/data";
import Sheet from "../components/Sheet";
import EmptyState from "../components/EmptyState";
import {
  IconChevronRight,
  IconCopy,
  IconMore,
  IconPlus,
  IconRoutines,
  IconTrash,
} from "../components/Icons";

export default function WorkoutsPage() {
  const { data, addRoutine, deleteRoutine, duplicateRoutine } = useData();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const menuRoutine = data.routines.find((r) => r.id === menuFor);

  function create() {
    const name = newName.trim();
    if (!name) return;
    const routine = addRoutine(name);
    setCreating(false);
    setNewName("");
    // abre o editor já com o seletor de exercícios na tela
    navigate(`/treinos/${routine.id}`, { state: { openPicker: true } });
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Treinos</h1>
        <button
          className="icon-btn accent"
          onClick={() => setCreating(true)}
          aria-label="Novo treino"
        >
          <IconPlus />
        </button>
      </header>

      {data.routines.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<IconRoutines size={40} />}
            title="Nenhum treino ainda"
            text='Crie treinos reutilizáveis, como "A - Superiores" ou "B - Inferiores", com exercícios, séries e cargas padrão.'
          >
            <button
              className="btn btn-primary"
              style={{ marginTop: 16 }}
              onClick={() => setCreating(true)}
            >
              Criar treino
            </button>
          </EmptyState>
        </div>
      ) : (
        <div className="list">
          {data.routines.map((routine) => {
            const totalSets = routine.exercises.reduce(
              (sum, re) => sum + re.sets.length,
              0,
            );
            return (
              <div
                key={routine.id}
                className="list-row"
                role="button"
                tabIndex={0}
                style={{ cursor: "pointer" }}
                onClick={() => navigate(`/treinos/${routine.id}`)}
              >
                <div className="list-row-main">
                  <div className="list-row-title">{routine.name}</div>
                  <div className="list-row-sub">
                    {routine.exercises.length}{" "}
                    {routine.exercises.length === 1 ? "exercício" : "exercícios"}
                    {totalSets > 0 && ` · ${totalSets} séries`}
                  </div>
                </div>
                <button
                  className="icon-btn subtle"
                  aria-label="Opções do treino"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuFor(routine.id);
                  }}
                >
                  <IconMore size={22} />
                </button>
                <span className="chevron">
                  <IconChevronRight size={20} />
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Criar novo treino */}
      <Sheet open={creating} onClose={() => setCreating(false)} title="Novo treino">
        <div className="field">
          <label className="field-label">Nome do treino</label>
          <input
            className="input"
            value={newName}
            placeholder='Ex.: A - Superiores'
            autoFocus
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
          />
        </div>
        <button
          className="btn btn-primary btn-block"
          disabled={!newName.trim()}
          style={{ opacity: newName.trim() ? 1 : 0.5 }}
          onClick={create}
        >
          Criar e adicionar exercícios
        </button>
      </Sheet>

      {/* Menu de opções (duplicar / excluir) */}
      <Sheet
        open={menuRoutine !== undefined}
        onClose={() => setMenuFor(null)}
        title={menuRoutine?.name}
      >
        <button
          className="btn btn-block"
          onClick={() => {
            if (menuFor) duplicateRoutine(menuFor);
            setMenuFor(null);
          }}
        >
          <IconCopy size={20} /> Duplicar treino
        </button>
        <button
          className="btn btn-danger btn-block"
          style={{ marginTop: 10 }}
          onClick={() => {
            if (
              menuFor &&
              window.confirm(`Excluir o treino "${menuRoutine?.name}"?`)
            ) {
              deleteRoutine(menuFor);
            }
            setMenuFor(null);
          }}
        >
          <IconTrash size={20} /> Excluir treino
        </button>
      </Sheet>
    </div>
  );
}
