'use client';

/**
 * Selector de bandeja: las teclas de categoría de la máquina. Al pulsar una, la
 * bandeja de abajo cambia — el mismo gesto que elegir una fila de producto en un
 * panel real, y el patrón que ya funcionaba en el sitio en producción.
 *
 * Implementa el patrón de pestañas del APG: una sola parada de tabulación en la
 * botonera (tabindex móvil) y flechas para moverse entre teclas, con
 * `aria-selected` y el panel asociado por `aria-controls`. Los paneles llegan ya
 * renderizados desde el servidor, así que los iconos siguen sin costar un solo
 * byte de JavaScript en el cliente.
 */
import { useRef, useState, type ReactNode } from 'react';

export type Tray = {
  key: string;
  label: string;
  panel: ReactNode;
};

export function SkillTrays({ trays }: { trays: Tray[] }) {
  const [active, setActive] = useState(0);
  const keyRefs = useRef<Array<HTMLButtonElement | null>>([]);

  /**
   * Mueve el foco y la selección con las flechas, en bucle, como pide el patrón
   * de pestañas del APG.
   */
  const onKeyDown = (event: React.KeyboardEvent) => {
    const offset = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (offset === 0) return;
    event.preventDefault();
    const next = (active + offset + trays.length) % trays.length;
    setActive(next);
    keyRefs.current[next]?.focus();
  };

  return (
    <div>
      <div
        role="tablist"
        aria-orientation="horizontal"
        onKeyDown={onKeyDown}
        className="no-scrollbar mb-5 flex gap-1.5 overflow-x-auto"
      >
        {trays.map((tray, index) => (
          <button
            type="button"
            key={tray.key}
            ref={(node) => {
              keyRefs.current[index] = node;
            }}
            role="tab"
            id={`tray-key-${tray.key}`}
            aria-selected={index === active}
            aria-controls={`tray-panel-${tray.key}`}
            tabIndex={index === active ? 0 : -1}
            onClick={() => setActive(index)}
            className={
              index === active
                ? 'plate-label shrink-0 rounded-xs border border-led bg-panel-raised px-3 py-2 text-led-ink'
                : 'plate-label shrink-0 rounded-xs border border-groove bg-panel-raised px-3 py-2 transition-colors hover:border-silk-dim hover:text-silk active:translate-y-px'
            }
          >
            {tray.label}
          </button>
        ))}
      </div>

      {trays.map((tray, index) => (
        <div
          key={tray.key}
          role="tabpanel"
          id={`tray-panel-${tray.key}`}
          aria-labelledby={`tray-key-${tray.key}`}
          hidden={index !== active}
        >
          {tray.panel}
        </div>
      ))}
    </div>
  );
}
