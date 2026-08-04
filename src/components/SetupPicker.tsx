import { useState } from "react";
import Sheet from "./Sheet";
import { IconCheck, IconPin } from "./Icons";

// Botão discreto para escolher o local/máquina de um exercício.
// Só aparece quando o exercício tem locais cadastrados — exercícios sem
// locais não ganham nenhum elemento a mais na interface.

type SetupPickerProps = {
  setups: string[];
  value: string | null;
  onChange: (setup: string | null) => void;
};

export default function SetupPicker({ setups, value, onChange }: SetupPickerProps) {
  const [open, setOpen] = useState(false);

  if (setups.length === 0) return null;

  return (
    <>
      <button
        className={`setup-btn${value ? " on" : ""}`}
        aria-label="Local ou máquina do exercício"
        onClick={() => setOpen(true)}
      >
        <IconPin size={15} />
        <span className="setup-btn-label">{value ?? "Local"}</span>
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Local / máquina">
        <div className="list">
          {setups.map((setup) => (
            <button
              key={setup}
              className="list-row"
              onClick={() => {
                onChange(setup === value ? null : setup);
                setOpen(false);
              }}
            >
              <div className="list-row-main">
                <div className="list-row-title">{setup}</div>
              </div>
              <span className={`pick-check${setup === value ? " on" : ""}`}>
                {setup === value && <IconCheck size={16} />}
              </span>
            </button>
          ))}
          <button
            className="list-row"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
          >
            <div className="list-row-main">
              <div className="list-row-title muted">Não informar</div>
            </div>
            <span className={`pick-check${value === null ? " on" : ""}`}>
              {value === null && <IconCheck size={16} />}
            </span>
          </button>
        </div>
      </Sheet>
    </>
  );
}
