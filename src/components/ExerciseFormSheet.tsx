import { useEffect, useState } from "react";
import { groupOrder, useData } from "../lib/data";
import { hasSetupColumns } from "../lib/cloud";
import Sheet from "./Sheet";
import { IconClose, IconEdit, IconPlus } from "./Icons";
import type { Exercise, Variation } from "../lib/types";

// Formulário de criar/editar exercício, com editor de variações em cartões
// (cada variação tem nome + observação própria). Usado na aba Exercícios
// e também dentro do seletor de exercícios, pra criar sem sair do fluxo.

const NEW_GROUP = "__novo__";

type ExerciseFormSheetProps = {
  open: boolean;
  onClose: () => void;
  /** Presente = edição de um exercício existente. */
  exerciseId?: string | null;
  /** Grupo pré-selecionado ao criar (ex.: filtro ativo no seletor). */
  defaultGroup?: string | null;
  /** Nome pré-preenchido ao criar (ex.: texto da busca). */
  defaultName?: string;
  onSaved?: (exercise: Exercise) => void;
};

export default function ExerciseFormSheet({
  open,
  onClose,
  exerciseId,
  defaultGroup,
  defaultName,
  onSaved,
}: ExerciseFormSheetProps) {
  const { data, addExercise, updateExercise, deleteExercise, addMuscleGroup } =
    useData();
  const groups = groupOrder(data);

  const [name, setName] = useState("");
  const [muscleGroup, setMuscleGroup] = useState("");
  const [newGroup, setNewGroup] = useState("");
  const [variations, setVariations] = useState<Variation[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [setups, setSetups] = useState<string[]>([]);
  const [defaultSetup, setDefaultSetup] = useState<string | null>(null);
  const [newSetup, setNewSetup] = useState("");

  useEffect(() => {
    if (!open) return;
    const existing = exerciseId
      ? data.exercises.find((e) => e.id === exerciseId)
      : undefined;
    setName(existing?.name ?? defaultName ?? "");
    setMuscleGroup(
      existing?.muscleGroup ?? defaultGroup ?? groups[0] ?? NEW_GROUP,
    );
    setNewGroup("");
    setVariations(existing ? existing.variations.map((v) => ({ ...v })) : []);
    setEditingIndex(null);
    setSetups(existing?.setups ?? []);
    setDefaultSetup(existing?.defaultSetup ?? null);
    setNewSetup("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, exerciseId]);

  function patchVariation(index: number, patch: Partial<Variation>) {
    setVariations((vs) =>
      vs.map((v, i) => (i === index ? { ...v, ...patch } : v)),
    );
  }

  function removeVariation(index: number) {
    setVariations((vs) => vs.filter((_, i) => i !== index));
    setEditingIndex(null);
  }

  function addVariation() {
    setVariations((vs) => [...vs, { name: "" }]);
    setEditingIndex(variations.length);
  }

  function addSetup() {
    const value = newSetup.trim();
    if (!value || setups.includes(value)) return;
    setSetups((list) => [...list, value]);
    setNewSetup("");
  }

  const canSave =
    name.trim() !== "" &&
    (muscleGroup !== NEW_GROUP || newGroup.trim() !== "");

  function save() {
    if (!canSave) return;
    let group = muscleGroup;
    if (group === NEW_GROUP) {
      group = newGroup.trim();
      addMuscleGroup(group);
    }
    const cleanVariations = variations
      .map((v) => ({
        name: v.name.trim(),
        notes: v.notes?.trim() || undefined,
      }))
      .filter((v) => v.name !== "");

    const cleanSetups = setups.map((s) => s.trim()).filter((s) => s !== "");
    const payload = {
      name: name.trim(),
      muscleGroup: group,
      variations: cleanVariations,
      setups: cleanSetups,
      defaultSetup:
        defaultSetup && cleanSetups.includes(defaultSetup) ? defaultSetup : null,
    };

    if (exerciseId) {
      updateExercise(exerciseId, payload);
      onSaved?.({ id: exerciseId, ...payload });
    } else {
      const created = addExercise(payload);
      onSaved?.(created);
    }
    onClose();
  }

  function remove() {
    if (!exerciseId) return;
    const usedIn = data.routines.filter((r) =>
      r.exercises.some((re) => re.exerciseId === exerciseId),
    );
    const warning =
      usedIn.length > 0
        ? ` Ele também será removido de: ${usedIn.map((r) => r.name).join(", ")}.`
        : "";
    if (window.confirm(`Excluir "${name}"?${warning}`)) {
      deleteExercise(exerciseId);
      onClose();
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={exerciseId ? "Editar exercício" : "Novo exercício"}
    >
      <div className="field">
        <label className="field-label">Nome</label>
        <input
          className="input"
          value={name}
          placeholder="Ex.: Supino"
          autoFocus={!exerciseId && !defaultName}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="field">
        <label className="field-label">Grupo muscular</label>
        <select
          className="select"
          value={muscleGroup}
          onChange={(e) => setMuscleGroup(e.target.value)}
        >
          {groups.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
          <option value={NEW_GROUP}>+ Novo grupo…</option>
        </select>
      </div>

      {muscleGroup === NEW_GROUP && (
        <div className="field">
          <label className="field-label">Nome do novo grupo</label>
          <input
            className="input"
            value={newGroup}
            placeholder="Ex.: Antebraço"
            onChange={(e) => setNewGroup(e.target.value)}
          />
        </div>
      )}

      <div className="field">
        <label className="field-label">Variações</label>
        {variations.length === 0 && (
          <p className="muted" style={{ fontSize: 14, margin: "4px 2px 10px" }}>
            Sem variações — o exercício aparece só pelo nome.
          </p>
        )}
        {variations.map((v, i) =>
          editingIndex === i ? (
            <div className="var-item editing" key={i}>
              <input
                className="input"
                value={v.name}
                placeholder="Nome da variação — ex.: Inclinado (halteres)"
                autoFocus
                onChange={(e) => patchVariation(i, { name: e.target.value })}
              />
              <textarea
                className="textarea"
                style={{ minHeight: 60, marginTop: 8 }}
                value={v.notes ?? ""}
                placeholder="Observação (opcional) — ex.: banco a 30°, pegada fechada"
                onChange={(e) => patchVariation(i, { notes: e.target.value })}
              />
              <div className="row-gap" style={{ marginTop: 8 }}>
                <button
                  className="btn btn-sm btn-primary"
                  disabled={v.name.trim() === ""}
                  style={{ opacity: v.name.trim() ? 1 : 0.5 }}
                  onClick={() => setEditingIndex(null)}
                >
                  OK
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => removeVariation(i)}
                >
                  Remover
                </button>
              </div>
            </div>
          ) : (
            <div className="var-item" key={i}>
              <button className="var-main" onClick={() => setEditingIndex(i)}>
                <div className="var-name">{v.name || "(sem nome)"}</div>
                {v.notes && <div className="var-notes">{v.notes}</div>}
              </button>
              <button
                className="icon-btn subtle"
                aria-label="Editar variação"
                onClick={() => setEditingIndex(i)}
              >
                <IconEdit size={18} />
              </button>
              <button
                className="icon-btn subtle"
                aria-label="Remover variação"
                onClick={() => removeVariation(i)}
              >
                <IconClose size={18} />
              </button>
            </div>
          ),
        )}
        <button className="btn btn-sm" onClick={addVariation}>
          <IconPlus size={16} /> Adicionar variação
        </button>
      </div>

      <div className="field">
        <label className="field-label">Local / máquina (opcional)</label>
        <p className="muted" style={{ fontSize: 13, margin: "0 2px 10px" }}>
          Para quando a mesma variação pesa diferente conforme a academia ou o
          aparelho. Toque num item para defini-lo como padrão.
        </p>
        {!hasSetupColumns() && (
          <p className="auth-error" style={{ fontSize: 13 }}>
            O banco ainda não tem as colunas de local/máquina — rode a migração
            em supabase/migrations para que essa lista seja salva na nuvem.
          </p>
        )}
        {setups.map((setup) => {
          const isDefault = setup === defaultSetup;
          return (
            <div className="var-item" key={setup}>
              <button
                className="var-main"
                onClick={() => setDefaultSetup(isDefault ? null : setup)}
              >
                <div className="var-name">{setup}</div>
                {isDefault && (
                  <div className="var-notes" style={{ color: "var(--accent)" }}>
                    Padrão
                  </div>
                )}
              </button>
              <button
                className="icon-btn subtle"
                aria-label={`Remover ${setup}`}
                onClick={() => {
                  setSetups((list) => list.filter((s) => s !== setup));
                  if (isDefault) setDefaultSetup(null);
                }}
              >
                <IconClose size={18} />
              </button>
            </div>
          );
        })}
        <div className="row-gap">
          <input
            className="input"
            value={newSetup}
            placeholder="Ex.: Vila Olímpia, Máquina preta"
            onChange={(e) => setNewSetup(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              addSetup();
            }}
          />
          <button
            className="btn btn-sm"
            disabled={!newSetup.trim()}
            style={{ opacity: newSetup.trim() ? 1 : 0.5 }}
            onClick={addSetup}
          >
            <IconPlus size={16} />
          </button>
        </div>
      </div>

      <button
        className="btn btn-primary btn-block"
        disabled={!canSave}
        style={{ opacity: canSave ? 1 : 0.5 }}
        onClick={save}
      >
        Salvar
      </button>

      {exerciseId && (
        <button
          className="btn btn-danger btn-block"
          style={{ marginTop: 10 }}
          onClick={remove}
        >
          Excluir exercício
        </button>
      )}
    </Sheet>
  );
}
