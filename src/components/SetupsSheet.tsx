import { useState } from "react";
import { useData } from "../lib/data";
import { hasSetupColumns } from "../lib/cloud";
import Sheet from "./Sheet";
import { IconClose, IconPlus } from "./Icons";

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
    setDefaultSetup,
    countUnlabeled,
    applySetupToUnlabeled,
  } = useData();
  const [novo, setNovo] = useState("");

  function adicionar() {
    const value = novo.trim();
    if (!value) return;
    addSetup(value);
    setNovo("");
  }

  function aplicarRetroativo() {
    const alvo = data.defaultSetup;
    if (!alvo) return;
    const { sessions, routines } = countUnlabeled();
    const total = sessions + routines;
    if (total === 0) {
      window.alert("Todos os registros já têm um local definido.");
      return;
    }
    const ok = window.confirm(
      `Marcar como "${alvo}" ${sessions} exercício(s) sem local nos seus registros` +
        (routines > 0 ? ` e ${routines} nos seus treinos salvos` : "") +
        `?\n\nIsso altera o histórico. Se quiser desfazer depois, exporte um backup antes (aba Ajustes).`,
    );
    if (ok) applySetupToUnlabeled(alvo);
  }

  const semLocal = countUnlabeled();

  return (
    <Sheet open={open} onClose={onClose} title="Locais / máquinas">
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

      {data.setups.map((setup) => {
        const isDefault = setup === data.defaultSetup;
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
                if (
                  window.confirm(
                    `Remover "${setup}" da lista? Os registros já feitos nele continuam marcados.`,
                  )
                ) {
                  removeSetup(setup);
                }
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

      {data.defaultSetup && semLocal.sessions + semLocal.routines > 0 && (
        <>
          <p className="section-title">Registros antigos</p>
          <button className="btn btn-block" onClick={aplicarRetroativo}>
            Marcar os {semLocal.sessions + semLocal.routines} sem local como “
            {data.defaultSetup}”
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
