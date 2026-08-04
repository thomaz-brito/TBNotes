import { useState } from "react";
import { useData } from "../lib/data";
import { hasSetupColumns } from "../lib/cloud";
import Sheet from "./Sheet";
import { IconClose, IconEdit, IconPlus } from "./Icons";

// Cadastro dos locais/máquinas do usuário. São globais: valem para todos
// os exercícios, e o padrão já vem selecionado ao registrar um treino.

export default function SetupsSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const {
    data,
    addSetup,
    removeSetup,
    renameSetup,
    setDefaultSetup,
    countUnlabeled,
    applySetupToUnlabeled,
  } = useData();
  const [novo, setNovo] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState("");

  function confirmarRename(antigo: string) {
    const valor = rascunho.trim();
    if (!valor || valor === antigo) {
      setEditando(null);
      return;
    }
    if (data.setups.includes(valor)) {
      window.alert(`Já existe um local chamado "${valor}".`);
      return;
    }
    renameSetup(antigo, valor);
    setEditando(null);
  }

  function adicionar() {
    const value = novo.trim();
    if (!value) return;
    addSetup(value);
    setNovo("");
  }

  function aplicarRetroativo() {
    const alvo = data.defaultSetup;
    if (!alvo) return;
    if (semLocal === 0) {
      window.alert("Todos os treinos já têm um local definido.");
      return;
    }
    const ok = window.confirm(
      `Marcar ${semLocal} treino(s) sem local como "${alvo}"?\n\n` +
        `Isso altera o histórico. Se quiser poder desfazer, exporte um backup antes (aba Ajustes).`,
    );
    if (ok) applySetupToUnlabeled(alvo);
  }

  const semLocal = countUnlabeled();

  return (
    <Sheet open={open} onClose={onClose} title="Locais">
      <p className="muted" style={{ fontSize: 14, margin: "0 2px 14px" }}>
        Onde você treina. A mesma variação costuma pesar diferente em cada
        academia ou aparelho, então cada local vira uma linha própria nos
        gráficos. Toque num item para defini-lo como padrão.
      </p>

      {!hasSetupColumns() && (
        <p className="auth-error" style={{ fontSize: 13 }}>
          O banco ainda não tem as colunas de local — rode a migração
          002_setups_globais.sql para que esta lista seja salva na nuvem.
        </p>
      )}

      {data.setups.length === 0 && (
        <p className="muted" style={{ fontSize: 14, margin: "0 2px 12px" }}>
          Nenhum local cadastrado. Enquanto não houver nenhum, o botão de local
          não aparece nos treinos.
        </p>
      )}

      {data.setups.map((setup) =>
        editando === setup ? (
          <div className="var-item editing" key={setup}>
            <input
              className="input"
              value={rascunho}
              autoFocus
              onChange={(e) => setRascunho(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmarRename(setup);
                if (e.key === "Escape") setEditando(null);
              }}
            />
            <div className="row-gap" style={{ marginTop: 8 }}>
              <button
                className="btn btn-sm btn-primary"
                disabled={!rascunho.trim() || rascunho.trim() === setup}
                style={{
                  opacity:
                    !rascunho.trim() || rascunho.trim() === setup ? 0.5 : 1,
                }}
                onClick={() => confirmarRename(setup)}
              >
                Salvar
              </button>
              <button className="btn btn-sm" onClick={() => setEditando(null)}>
                Cancelar
              </button>
            </div>
            <p className="muted" style={{ fontSize: 13, margin: "10px 2px 0" }}>
              O novo nome vale para todos os treinos já marcados com “{setup}”.
            </p>
          </div>
        ) : (
          <div className="var-item" key={setup}>
            <button
              className="var-main"
              onClick={() =>
                setDefaultSetup(setup === data.defaultSetup ? null : setup)
              }
            >
              <div className="var-name">{setup}</div>
              {setup === data.defaultSetup && (
                <div className="var-notes" style={{ color: "var(--accent)" }}>
                  Padrão
                </div>
              )}
            </button>
            <button
              className="icon-btn subtle"
              aria-label={`Renomear ${setup}`}
              onClick={() => {
                setEditando(setup);
                setRascunho(setup);
              }}
            >
              <IconEdit size={18} />
            </button>
            <button
              className="icon-btn subtle"
              aria-label={`Remover ${setup}`}
              onClick={() => {
                if (
                  window.confirm(
                    `Remover "${setup}" da lista? Os treinos já marcados com ele continuam como estão.`,
                  )
                ) {
                  removeSetup(setup);
                }
              }}
            >
              <IconClose size={18} />
            </button>
          </div>
        ),
      )}

      <div className="row-gap">
        <input
          className="input"
          value={novo}
          placeholder="Ex.: Vila Olímpia, Zona Norte"
          onChange={(e) => setNovo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            adicionar();
          }}
        />
        <button
          className="btn btn-sm"
          disabled={!novo.trim()}
          style={{ opacity: novo.trim() ? 1 : 0.5 }}
          onClick={adicionar}
        >
          <IconPlus size={16} />
        </button>
      </div>

      {data.defaultSetup && semLocal > 0 && (
        <>
          <p className="section-title">Treinos antigos</p>
          <button className="btn btn-block" onClick={aplicarRetroativo}>
            Marcar os {semLocal} sem local como “{data.defaultSetup}”
          </button>
          <p className="muted" style={{ fontSize: 13, margin: "10px 2px 0" }}>
            Preenche de uma vez todo o histórico anterior ao cadastro dos
            locais. Depois é só trocar nos dias em que você treinou fora.
          </p>
        </>
      )}
    </Sheet>
  );
}
