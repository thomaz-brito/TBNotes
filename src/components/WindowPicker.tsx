import { useState } from "react";
import type { TimeWindow } from "../lib/stats";

// Seletor da janela de análise dos gráficos. A janela redefine o instante
// zero: âncoras e baselines são recalculados a partir do início do intervalo.

export type WindowPreset = "30d" | "90d" | "ano" | "tudo" | "custom";

const PRESETS: Array<{ id: WindowPreset; label: string }> = [
  { id: "30d", label: "30 dias" },
  { id: "90d", label: "90 dias" },
  { id: "ano", label: "Este ano" },
  { id: "tudo", label: "Tudo" },
  { id: "custom", label: "Personalizado" },
];

/** Converte o preset (ou as datas escolhidas) na janela usada nos cálculos. */
export function resolveWindow(
  preset: WindowPreset,
  customFrom: string,
  customTo: string,
): TimeWindow {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  if (preset === "tudo") return null;

  if (preset === "custom") {
    if (!customFrom || !customTo) return null;
    const [fy, fm, fd] = customFrom.split("-").map(Number);
    const [ty, tm, td] = customTo.split("-").map(Number);
    const from = new Date(fy, fm - 1, fd, 0, 0, 0, 0).getTime();
    const to = new Date(ty, tm - 1, td, 23, 59, 59, 999).getTime();
    return from <= to ? { from, to } : { from: to, to: from };
  }

  if (preset === "ano") {
    return { from: new Date(now.getFullYear(), 0, 1).getTime(), to: end.getTime() };
  }

  const days = preset === "30d" ? 30 : 90;
  const from = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - days + 1,
  ).getTime();
  return { from, to: end.getTime() };
}

type WindowPickerProps = {
  preset: WindowPreset;
  customFrom: string;
  customTo: string;
  onChange: (preset: WindowPreset, from: string, to: string) => void;
};

export default function WindowPicker({
  preset,
  customFrom,
  customTo,
  onChange,
}: WindowPickerProps) {
  const [open, setOpen] = useState(preset === "custom");

  return (
    <>
      <div className="chips" style={{ paddingTop: 0 }}>
        {PRESETS.map((p) => (
          <button
            key={p.id}
            className={`chip${preset === p.id ? " active" : ""}`}
            onClick={() => {
              setOpen(p.id === "custom");
              onChange(p.id, customFrom, customTo);
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {preset === "custom" && open && (
        <div className="row-gap" style={{ marginBottom: 12 }}>
          <input
            className="input"
            type="date"
            aria-label="Data inicial"
            value={customFrom}
            onChange={(e) => onChange("custom", e.target.value, customTo)}
          />
          <span className="muted">até</span>
          <input
            className="input"
            type="date"
            aria-label="Data final"
            value={customTo}
            onChange={(e) => onChange("custom", customFrom, e.target.value)}
          />
        </div>
      )}
    </>
  );
}
