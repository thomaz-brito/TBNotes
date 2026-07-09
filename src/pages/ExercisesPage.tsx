import { useState } from "react";
import { groupOrder, useData } from "../lib/data";
import Sheet from "../components/Sheet";
import GroupChips from "../components/GroupChips";
import EmptyState from "../components/EmptyState";
import { IconChevronRight, IconDumbbell, IconPlus } from "../components/Icons";

const NEW_GROUP = "__novo__";

type FormState = {
  id?: string; // presente = editando um exercício existente
  name: string;
  muscleGroup: string;
  newGroup: string;
  variationsText: string; // uma variação por linha
  notes: string;
};

export default function ExercisesPage() {
  const {
    data,
    addExercise,
    updateExercise,
    deleteExercise,
    addMuscleGroup,
  } = useData();
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);

  const groups = groupOrder(data);
  const query = search.trim().toLowerCase();
  const visible = data.exercises.filter((e) => {
    if (groupFilter && e.muscleGroup !== groupFilter) return false;
    if (!query) return true;
    return (
      e.name.toLowerCase().includes(query) ||
      e.variations.some((v) => v.toLowerCase().includes(query))
    );
  });

  function openNew() {
    setForm({
      name: "",
      muscleGroup: groupFilter ?? groups[0] ?? NEW_GROUP,
      newGroup: "",
      variationsText: "",
      notes: "",
    });
  }

  function openEdit(id: string) {
    const exercise = data.exercises.find((e) => e.id === id);
    if (!exercise) return;
    setForm({
      id,
      name: exercise.name,
      muscleGroup: exercise.muscleGroup,
      newGroup: "",
      variationsText: exercise.variations.join("\n"),
      notes: exercise.notes ?? "",
    });
  }

  function save() {
    if (!form) return;
    const name = form.name.trim();
    if (!name) return;

    let group = form.muscleGroup;
    if (group === NEW_GROUP) {
      group = form.newGroup.trim();
      if (!group) return;
      addMuscleGroup(group);
    }

    const variations = form.variationsText
      .split("\n")
      .map((v) => v.trim())
      .filter((v) => v !== "");

    const notes = form.notes.trim() || undefined;
    if (form.id) {
      updateExercise(form.id, { name, muscleGroup: group, variations, notes });
    } else {
      addExercise({ name, muscleGroup: group, variations, notes });
    }
    setForm(null);
  }

  function remove() {
    if (!form?.id) return;
    const usedIn = data.routines.filter((r) =>
      r.exercises.some((re) => re.exerciseId === form.id),
    );
    const warning =
      usedIn.length > 0
        ? ` Ele também será removido de: ${usedIn.map((r) => r.name).join(", ")}.`
        : "";
    if (window.confirm(`Excluir "${form.name}"?${warning}`)) {
      deleteExercise(form.id);
      setForm(null);
    }
  }

  const canSave =
    !!form &&
    form.name.trim() !== "" &&
    (form.muscleGroup !== NEW_GROUP || form.newGroup.trim() !== "");

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
                          ? `${exercise.variations.length} variações`
                          : exercise.notes || "Sem variações"}
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

      <Sheet
        open={form !== null}
        onClose={() => setForm(null)}
        title={form?.id ? "Editar exercício" : "Novo exercício"}
      >
        {form && (
          <>
            <div className="field">
              <label className="field-label">Nome</label>
              <input
                className="input"
                value={form.name}
                placeholder="Ex.: Supino"
                autoFocus={!form.id}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="field">
              <label className="field-label">Grupo muscular</label>
              <select
                className="select"
                value={form.muscleGroup}
                onChange={(e) =>
                  setForm({ ...form, muscleGroup: e.target.value })
                }
              >
                {groups.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
                <option value={NEW_GROUP}>+ Novo grupo…</option>
              </select>
            </div>

            {form.muscleGroup === NEW_GROUP && (
              <div className="field">
                <label className="field-label">Nome do novo grupo</label>
                <input
                  className="input"
                  value={form.newGroup}
                  placeholder="Ex.: Antebraço"
                  onChange={(e) =>
                    setForm({ ...form, newGroup: e.target.value })
                  }
                />
              </div>
            )}

            <div className="field">
              <label className="field-label">Variações (uma por linha)</label>
              <textarea
                className="textarea"
                style={{ minHeight: 110 }}
                value={form.variationsText}
                placeholder={"Reto (barra)\nInclinado (halteres)\nDeclinado"}
                onChange={(e) =>
                  setForm({ ...form, variationsText: e.target.value })
                }
              />
            </div>

            <div className="field">
              <label className="field-label">Observações (opcional)</label>
              <textarea
                className="textarea"
                value={form.notes}
                placeholder="Ex.: banco no ângulo 30°, pegada fechada…"
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            <button
              className="btn btn-primary btn-block"
              disabled={!canSave}
              style={{ opacity: canSave ? 1 : 0.5 }}
              onClick={save}
            >
              Salvar
            </button>

            {form.id && (
              <button
                className="btn btn-danger btn-block"
                style={{ marginTop: 10 }}
                onClick={remove}
              >
                Excluir exercício
              </button>
            )}
          </>
        )}
      </Sheet>
    </div>
  );
}
