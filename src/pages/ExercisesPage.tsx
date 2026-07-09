import { useState } from "react";
import { groupOrder, useData } from "../lib/data";
import ExerciseFormSheet from "../components/ExerciseFormSheet";
import GroupChips from "../components/GroupChips";
import EmptyState from "../components/EmptyState";
import { IconChevronRight, IconDumbbell, IconPlus } from "../components/Icons";

export default function ExercisesPage() {
  const { data } = useData();
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const groups = groupOrder(data);
  const query = search.trim().toLowerCase();
  const visible = data.exercises.filter((e) => {
    if (groupFilter && e.muscleGroup !== groupFilter) return false;
    if (!query) return true;
    return (
      e.name.toLowerCase().includes(query) ||
      e.variations.some((v) => v.name.toLowerCase().includes(query))
    );
  });

  function openNew() {
    setEditingId(null);
    setFormOpen(true);
  }

  function openEdit(id: string) {
    setEditingId(id);
    setFormOpen(true);
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Exercícios</h1>
        <button className="icon-btn accent" onClick={openNew} aria-label="Novo exercício">
          <IconPlus />
        </button>
      </header>

      <input
        className="input search-input"
        type="search"
        placeholder="Buscar exercício ou variação…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <GroupChips groups={groups} value={groupFilter} onChange={setGroupFilter} />

      {visible.length === 0 ? (
        <EmptyState
          icon={<IconDumbbell size={40} />}
          title="Nenhum exercício encontrado"
          text={
            query
              ? "Tente outro nome ou crie um exercício novo no botão +."
              : "Toque no + para adicionar seu primeiro exercício."
          }
        />
      ) : (
        groups.map((group) => {
          const items = visible.filter((e) => e.muscleGroup === group);
          if (items.length === 0) return null;
          return (
            <section key={group}>
              <p className="section-title">{group}</p>
              <div className="list">
                {items.map((exercise) => (
                  <button
                    key={exercise.id}
                    className="list-row"
                    onClick={() => openEdit(exercise.id)}
                  >
                    <div className="list-row-main">
                      <div className="list-row-title">{exercise.name}</div>
                      <div className="list-row-sub">
                        {exercise.variations.length > 0
                          ? `${exercise.variations.length} ${
                              exercise.variations.length === 1
                                ? "variação"
                                : "variações"
                            }`
                          : "Sem variações"}
                      </div>
                    </div>
                    <span className="chevron">
                      <IconChevronRight size={20} />
                    </span>
                  </button>
                ))}
              </div>
            </section>
          );
        })
      )}

      <ExerciseFormSheet
        open={formOpen}
        onClose={() => setFormOpen(false)}
        exerciseId={editingId}
        defaultGroup={groupFilter}
      />
    </div>
  );
}
