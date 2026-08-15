'use client';

/**
 * Riel: la bandeja de la máquina que se recorre en horizontal. El
 * desplazamiento es CSS nativo (`scroll-snap`), sin librería de carrusel: la
 * plataforma cubre snap, alineación y scroll suave desde 2020, y lo único que
 * una librería añadiría —bucle infinito y arrastre con ratón— no pertenece a
 * una bandeja física, que tiene principio y final.
 *
 * Los controles flotan sobre los bordes del riel en lugar de ocupar una fila
 * propia, así que no dejan hueco muerto bajo la bandeja, y se ocultan cuando no
 * hay recorrido en esa dirección. El cursor pasa a mano abierta y cerrada
 * durante el arrastre, que es lo que la gente ya reconoce como «esto se
 * empuja».
 *
 * Accesibilidad: cuando los items no son focusables por sí mismos, el elemento
 * que scrollea recibe `tabIndex` y `role="group"` con nombre, porque un `div`
 * genérico no admite `aria-label` y sin foco el riel sería inalcanzable por
 * teclado. Cuando cada item es un enlace, el foco de los enlaces ya lo hace
 * alcanzable y el contenedor no necesita nada.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Índice del primer item visible dentro del riel, observado sin escuchar el
 * evento de scroll: `IntersectionObserver` solo despierta al cruzar el umbral.
 *
 * @param railRef - Referencia al elemento que scrollea.
 * @param count - Número de items del riel.
 * @returns Índice activo y si hay recorrido pendiente a cada lado.
 */
function useRailPosition(railRef: React.RefObject<HTMLDivElement | null>, count: number) {
  const [active, setActive] = useState(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail || count === 0) return;

    const items = Array.from(rail.children) as HTMLElement[];
    const visibleNow = new Set<number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const index = items.indexOf(entry.target as HTMLElement);
          if (index < 0) continue;
          if (entry.isIntersecting) visibleNow.add(index);
          else visibleNow.delete(index);
        }
        if (visibleNow.size > 0) {
          const indexes = [...visibleNow];
          const first = Math.min(...indexes);
          setActive(first);
          setAtStart(first === 0);
          setAtEnd(Math.max(...indexes) === items.length - 1);
        }
      },
      { root: rail, threshold: 0.6 },
    );

    items.forEach((item) => {
      observer.observe(item);
    });
    return () => observer.disconnect();
  }, [railRef, count]);

  return { active, atStart, atEnd };
}

/**
 * Arrastre con puntero: lo único que una librería de carrusel aporta y la
 * plataforma no tiene (la propuesta CSS de «draggable scrollers» lleva parada
 * desde 2024). Táctil y trackpad ya funcionan solos, así que esto solo entra
 * para ratón.
 *
 * @param railRef - Referencia al elemento que scrollea.
 * @returns Manejadores de puntero y si hay un arrastre en curso.
 */
function useDragScroll(railRef: React.RefObject<HTMLDivElement | null>) {
  const drag = useRef<{ startX: number; startLeft: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse') return;
    const rail = railRef.current;
    if (!rail) return;
    drag.current = { startX: event.clientX, startLeft: rail.scrollLeft };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const rail = railRef.current;
    if (!drag.current || !rail) return;
    const delta = event.clientX - drag.current.startX;
    if (Math.abs(delta) < 3) return;
    if (!dragging) setDragging(true);
    rail.style.scrollSnapType = 'none';
    rail.scrollLeft = drag.current.startLeft - delta;
  };

  const endDrag = () => {
    const rail = railRef.current;
    if (rail) rail.style.scrollSnapType = '';
    drag.current = null;
    setDragging(false);
  };

  return {
    dragging,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerLeave: endDrag,
    },
  };
}

/**
 * Progreso de scroll del riel en [0, 1], leído solo cuando hay scroll y
 * coalescido a un frame: alimenta el canal LED del modo `channel`.
 */
function useRailProgress(railRef: React.RefObject<HTMLDivElement | null>) {
  const [progress, setProgress] = useState(0);
  const frame = useRef(0);

  const onScroll = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const rail = railRef.current;
      if (!rail) return;
      const max = rail.scrollWidth - rail.clientWidth;
      setProgress(max > 0 ? Math.min(1, Math.max(0, rail.scrollLeft / max)) : 0);
    });
  }, [railRef]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  return { progress, onScroll };
}

export type RailProps = {
  children: React.ReactNode;
  /** Nombre accesible; obligatorio salvo que los items sean enlaces. */
  label?: string;
  /** `true` cuando cada item ya es focusable (una card enlazada). */
  itemsFocusable?: boolean;
  /** Número de items, para los indicadores de posición. */
  count: number;
  /** Etiquetas de los controles, traducidas por el llamador. */
  controls?: { previous: string; next: string; goTo: string };
  /**
   * Indicador de posición: `dots` (por defecto) o `channel`, el canal fresado
   * con relleno LED y lectura `03/06` que comparte lenguaje con la cronología.
   */
  readout?: 'dots' | 'channel';
  className?: string;
};

export function Rail({
  children,
  label,
  itemsFocusable = false,
  count,
  controls,
  readout = 'dots',
  className = '',
}: RailProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const { active, atStart, atEnd } = useRailPosition(railRef, count);
  const { dragging, handlers } = useDragScroll(railRef);
  const { progress, onScroll } = useRailProgress(railRef);

  const scrollToItem = useCallback((index: number) => {
    const rail = railRef.current;
    const item = rail?.children[index] as HTMLElement | undefined;
    item?.scrollIntoView({ inline: 'start', block: 'nearest' });
  }, []);

  const step = useCallback(
    (direction: 1 | -1) => {
      if (direction === 1 && atEnd) return scrollToItem(0);
      if (direction === -1 && atStart) return scrollToItem(count - 1);
      scrollToItem(Math.min(count - 1, Math.max(0, active + direction)));
    },
    [active, atStart, atEnd, count, scrollToItem],
  );

  const groupProps = itemsFocusable ? {} : { tabIndex: 0, role: 'group', 'aria-label': label };

  const hasControls = Boolean(controls) && count > 1;

  return (
    <div className="group/rail relative">
      <div
        ref={railRef}
        {...groupProps}
        {...handlers}
        onScroll={readout === 'channel' ? onScroll : undefined}
        data-dragging={dragging ? 'true' : undefined}
        className={`rail ${className}`}
      >
        {children}
      </div>

      {hasControls && controls ? (
        <>
          <RailArrow direction="start" label={controls.previous} onClick={() => step(-1)} />
          <RailArrow direction="end" label={controls.next} onClick={() => step(1)} />
          {readout === 'channel' ? (
            <div className="mt-6 flex items-center gap-4">
              <div className="relative h-2 flex-1 overflow-hidden rounded-full border border-groove bg-panel-deep shadow-[inset_0_1px_3px_rgba(0,0,0,0.45)]">
                <div
                  aria-hidden
                  className="absolute inset-y-0 left-0 rounded-full bg-led-dim shadow-[0_0_10px_rgba(52,211,153,0.25)]"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <span className="font-spec text-xs tracking-widest text-silk-dim">
                {String(active + 1).padStart(2, '0')}/{String(count).padStart(2, '0')}
              </span>
            </div>
          ) : (
            <ol className="mt-5 flex justify-center gap-0.5">
              {Array.from({ length: count }).map((_, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: los puntos son posicionales; el índice es su identidad
                <li key={index}>
                  <button
                    type="button"
                    onClick={() => scrollToItem(index)}
                    aria-label={`${controls.goTo} ${index + 1}`}
                    aria-current={index === active ? 'true' : undefined}
                    className="grid size-6 place-items-center"
                  >
                    <span
                      aria-hidden
                      className={
                        index === active
                          ? 'block h-1 w-5 rounded-full bg-led transition-all'
                          : 'block size-1 rounded-full bg-groove transition-all hover:bg-silk-dim'
                      }
                    />
                  </button>
                </li>
              ))}
            </ol>
          )}
        </>
      ) : null}
    </div>
  );
}

/**
 * Flecha flotante del riel, anclada al borde y centrada en vertical. Siempre
 * operativa: en los extremos la bandeja da la vuelta, como el tambor de una
 * máquina real, así que ninguna dirección queda muerta.
 */
function RailArrow({
  direction,
  label,
  onClick,
}: {
  direction: 'start' | 'end';
  label: string;
  onClick: () => void;
}) {
  const side = direction === 'start' ? '-left-3 md:-left-5' : '-right-3 md:-right-5';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`absolute top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-groove bg-panel-raised/90 text-silk shadow-[var(--shadow-drop)] backdrop-blur-sm transition-colors hover:border-led hover:text-led-ink active:translate-y-[calc(-50%+1px)] ${side}`}
    >
      <svg
        aria-hidden="true"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={direction === 'start' ? { transform: 'scaleX(-1)' } : undefined}
      >
        <path d="M9 6l6 6-6 6" />
      </svg>
    </button>
  );
}
