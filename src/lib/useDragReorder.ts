import { useRef, useState } from "react";
import type React from "react";

// Arrastar-pra-reordenar compartilhado (editor de treino e registros do dia).
// - Durante o arraste nada muda nos dados: o cartão segue o dedo, os vizinhos
//   deslizam visualmente e a troca é aplicada só ao soltar.
// - Coordenadas do DOCUMENTO (não da janela): a rolagem automática perto das
//   bordas funciona sem desalinhar o cartão do dedo.
// - O deslocamento é limitado aos limites da lista (sem rolagem infinita).

const CARD_GAP = 12;
const EDGE = 110; // zona de ativação da rolagem automática, em px
const MAX_SPEED = 16; // px por quadro
const TABBAR = 70; // desconto da barra de abas na borda inferior

export type DragState = {
  from: number;
  to: number;
  dy: number;
  height: number; // altura do cartão arrastado + espaçamento
};

export function useDragReorder(onReorder: (from: number, to: number) => void) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<{
    from: number;
    to: number;
    startPointerDoc: number;
    lastClientY: number;
    slots: Array<{ top: number; height: number }>; // coords do documento
  } | null>(null);
  const rafId = useRef<number | null>(null);
  const cardRefs = useRef<Array<HTMLElement | null>>([]);

  function setCardRef(index: number) {
    return (el: HTMLElement | null) => {
      cardRefs.current[index] = el;
    };
  }

  function updateDrag(clientY: number) {
    const st = dragRef.current;
    if (!st) return;
    const pointerDoc = clientY + window.scrollY;

    // limita o deslocamento aos limites da lista
    const me = st.slots[st.from];
    const first = st.slots[0];
    const last = st.slots[st.slots.length - 1];
    const minDy = first.top - me.top;
    const maxDy = last.top + last.height - (me.top + me.height);
    const dy = Math.min(maxDy, Math.max(minDy, pointerDoc - st.startPointerDoc));

    // destino: a BORDA do cartão arrastado cruza o ponto médio do vizinho
    // (borda de baixo ao descer, de cima ao subir). Usar o centro falharia
    // na última posição: com o deslocamento limitado, o centro de um cartão
    // grande nunca cruza o centro do último, e ele não abriria espaço.
    const topEdge = me.top + dy;
    const bottomEdge = me.top + me.height + dy;
    let to = st.from;
    for (let i = 0; i < st.slots.length; i++) {
      if (i === st.from) continue;
      const mid = st.slots[i].top + st.slots[i].height / 2;
      if (i < st.from && topEdge < mid) to = Math.min(to, i);
      if (i > st.from && bottomEdge > mid) to = Math.max(to, i);
    }

    st.to = to;
    setDrag({ from: st.from, to, dy, height: me.height + CARD_GAP });
  }

  /** Rolagem automática: dedo perto da borda de cima/baixo rola a página. */
  function autoScrollTick() {
    const st = dragRef.current;
    if (!st) return;
    const bottomStart = window.innerHeight - EDGE - TABBAR;
    const y = st.lastClientY;

    let speed = 0;
    if (y < EDGE) {
      speed = -Math.ceil(((EDGE - y) / EDGE) * MAX_SPEED);
    } else if (y > bottomStart) {
      speed = Math.ceil(((y - bottomStart) / EDGE) * MAX_SPEED);
    }

    if (speed !== 0) {
      window.scrollBy(0, speed);
      updateDrag(y); // a página rolou: o ponto do documento sob o dedo mudou
    }
    rafId.current = requestAnimationFrame(autoScrollTick);
  }

  function onDragStart(e: React.PointerEvent, index: number, count: number) {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const slots = Array.from({ length: count }, (_, i) => {
      const rect = cardRefs.current[i]?.getBoundingClientRect();
      return {
        top: (rect?.top ?? 0) + window.scrollY,
        height: rect?.height ?? 0,
      };
    });
    dragRef.current = {
      from: index,
      to: index,
      startPointerDoc: e.clientY + window.scrollY,
      lastClientY: e.clientY,
      slots,
    };
    setDrag({
      from: index,
      to: index,
      dy: 0,
      height: slots[index].height + CARD_GAP,
    });
    rafId.current = requestAnimationFrame(autoScrollTick);
  }

  function onDragMove(e: React.PointerEvent) {
    const st = dragRef.current;
    if (!st) return;
    st.lastClientY = e.clientY;
    updateDrag(e.clientY);
  }

  function onDragEnd() {
    if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    rafId.current = null;
    const st = dragRef.current;
    dragRef.current = null;
    setDrag(null);
    if (st && st.to !== st.from) onReorder(st.from, st.to);
  }

  /** Props pra alça de arrastar do cartão `index` (de `count` cartões). */
  function handleProps(index: number, count: number) {
    return {
      onPointerDown: (e: React.PointerEvent) => onDragStart(e, index, count),
      onPointerMove: onDragMove,
      onPointerUp: onDragEnd,
      onPointerCancel: onDragEnd,
    };
  }

  /** Deslocamento visual de cada cartão durante o arraste. */
  function dragStyle(index: number): React.CSSProperties | undefined {
    if (!drag) return undefined;
    if (index === drag.from) {
      return {
        transform: `translateY(${drag.dy}px)`,
        transition: "none",
        zIndex: 10,
        position: "relative",
      };
    }
    let shift = 0;
    if (drag.from < drag.to && index > drag.from && index <= drag.to) {
      shift = -drag.height;
    } else if (drag.from > drag.to && index >= drag.to && index < drag.from) {
      shift = drag.height;
    }
    return { transform: `translateY(${shift}px)`, transition: "transform 0.15s" };
  }

  return { drag, setCardRef, handleProps, dragStyle };
}
