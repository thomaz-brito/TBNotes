import type { ReactNode } from "react";

// "Sheet": painel que desliza de baixo pra cima, padrão comum em apps iOS.
// Com center=true vira um diálogo no meio da tela (bom pra caixas de texto,
// que o teclado do iPhone taparia se estivessem embaixo).
// Fecha ao tocar no fundo escurecido.

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  center?: boolean;
  children: ReactNode;
};

export default function Sheet({
  open,
  onClose,
  title,
  center = false,
  children,
}: SheetProps) {
  if (!open) return null;

  return (
    <div
      className={`sheet-backdrop${center ? " centered" : ""}`}
      onClick={onClose}
    >
      <div
        className={center ? "modal" : "sheet"}
        onClick={(e) => e.stopPropagation()}
      >
        {!center && <div className="sheet-handle" />}
        {title && <h2 className="sheet-title">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
