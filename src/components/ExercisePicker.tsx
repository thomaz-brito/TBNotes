import { useEffect, useState } from "react";
import { groupOrder, useData } from "../lib/data";
import type { Exercise, Variation } from "../lib/types";
import GroupChips from "./GroupChips";
import ExerciseFormSheet from "./ExerciseFormSheet";
import { IconCheck, IconChevronDown, IconChevronRight, IconPlus } from "./Icons";

// Seletor de exercícios usado no editor de treino e na sessão do dia.
// - Filtro por grupo muscular + busca
// - Exercícios com variações expandem num "acordeão"
// - Tocar alterna entre adicionado/removido (sem duplicar)
// - Botão Concluir fixo no topo
// - Criar exercício novo sem sair do fluxo

type ExercisePickerProps = {
  open: boolean;
  onClose: () => void;
  isAdded: (exerciseId: string, variation: string | null) => boolean;
  onToggle: (exerciseId: string, variation: string | null) => void;
};

export default function ExercisePicker({
  open,
  onClose,
  isAdded,
  onToggle,
}: ExercisePickerProps) {
  const { data } = useData();
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // limpa busca/filtro sempre que o seletor abre
  useEffect(() => {
    if (open) {
      setSearch("");
      setGroupFilter(null);
      setExpandedId(null);
      setCreating(false);
    }
  }, [open]);

  if (!open) return null;

  const groups = groupOrder(data);
  const query = search.trim().toLowerCase();

  function matches(exercise: Exercise): boolean {
    if (groupFilter && exercise.muscleGroup !== groupFilter) return false;
    if (!query) return true;
    if (exercise.name.toLowerCase().includes(query)) return true;
    return exercise.variations.some((v) =>
      v.name.toLowerCase().includes(query),
    );
  }

  function matchedVariations(exercise: Exercise): Variation[] {
    if (!query || exercise.name.toLowerCase().includes(query)) {
      return exercise.variations;
    }
    return exercise.variations.filter((v) =>
      v.name.toLowerCase().includes(query),
    );
  }

  function addedCount(exercise: Exercise): number {
    if (exercise.variations.length === 0) {
      return isAdded(exercise.id, null) ? 1 : 0;
    }
    return exercise.variations.filter((v) => isAdded(exercise.id, v.name))
      .length;
  }

  const visibleGroups = groups
    .map((group) => ({
      group,
      items: data.exercises.filter(
        (e) => e.muscleGroup === group && matches(e),
      ),
    }))
    .filter(({ items }) => items.length > 0);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-sticky">
          <div className="sheet-handle" />
          <div className="sheet-title-row">
            <h2 className="sheet-title" style={{ margin: 0 }}>
              Adicionar exercício
            </h2>
            <button className="btn btn-primary btn-sm" onClick={onClose}>
              Concluir
            </button>
          </div>
          <input
            className="input search-input"
            type="search"
            placeholder="Buscar exercício ou variação…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <GroupChips
            groups={groups}
            value={groupFilter}
            onChange={setGroupFilter}
          />
        </div>

        {visibleGroups.length === 0 && (
          <p className="empty-text" style={{ textAlign: "center", padding: "24px 24px 8px" }}>
            Nenhum exercício encontrado.
          </p>
        )}

        {visibleGroups.map(({ group, items }) => (
          <section key={group}>
            <p className="section-title">{group}</p>
            <div className="list">
              {items.map((exercise) => {
                const hasVariations = exercise.variations.length > 0;
                const count = addedCount(exercise);
                const expanded =
                  expandedId === exercise.id ||
                  (query !== "" &&
                    hasVariations &&
                    !exercise.name.toLowerCase().includes(query));

                return (
                  <div key={exercise.id}>
                    <button
                      className="list-row"
                      onClick={() => {
                        if (hasVariations) {
                          setExpandedId(expanded ? null : exercise.id);
                        } else {
                          onToggle(exercise.id, null);
                        }
                      }}
                    >
                      <div className="list-row-main">
                        <div className="list-row-title">{exercise.name}</div>
                        {(hasVariations || count > 0) && (
                          <div className="list-row-sub">
                            {hasVariations &&
                              `${exercise.variations.length} variações`}
                            {count > 0 && (
                              <span
                                style={{ color: "var(--accent)", fontWeight: 600 }}
                              >
                                {hasVariations ? " · " : ""}
                                {count} no treino
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      {hasVariations ? (
                        <span className="chevron">
                          {expanded ? (
                            <IconChevronDown size={20} />
                          ) : (
                            <IconChevronRight size={20} />
                          )}
                        </span>
                      ) : (
                        <span
                          className={`pick-check${count > 0 ? " on" : ""}`}
                          aria-hidden="true"
                        >
                          {count > 0 && <IconCheck size={16} />}
                        </span>
                      )}
                    </button>

                    {hasVariations &&
                      expanded &&
                      matchedVariations(exercise).map((variation) => {
                        const added = isAdded(exercise.id, variation.name);
                        return (
                          <button
                            key={variation.name}
                            className="list-row variation-row"
                            onClick={() => onToggle(exercise.id, variation.name)}
                          >
                            <div className="list-row-main">
                              <div
                                className="list-row-title"
                                style={{ fontWeight: 500, fontSize: 15 }}
                              >
                                {variation.name}
                              </div>
                              {variation.notes && (
                                <div className="list-row-sub">
                                  {variation.notes}
                                </div>
                              )}
                            </div>
                            <span
                              className={`pick-check${added ? " on" : ""}`}
                              aria-hidden="true"
                            >
                              {added && <IconCheck size={16} />}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        <button
          className="btn btn-block"
          style={{ marginTop: 12 }}
          onClick={() => setCreating(true)}
        >
          <IconPlus size={18} /> Criar novo exercício
        </button>

        <ExerciseFormSheet
          open={creating}
          onClose={() => setCreating(false)}
          defaultGroup={groupFilter}
          defaultName={search.trim()}
          onSaved={(exercise) => {
            // mostra o exercício recém-criado já expandido
            setSearch("");
            setGroupFilter(exercise.muscleGroup);
            setExpandedId(exercise.id);
          }}
        />
      </div>
    </div>
  );
}
