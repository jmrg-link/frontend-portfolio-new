'use client';

/**
 * Menú de navegación en móvil: tecla hamburguesa que despliega el panel de
 * secciones bajo la cabecera. Sustituye a la fila scrolleable, que escondía la
 * mitad de los destinos fuera de pantalla. Se cierra al elegir una sección,
 * con Escape, o al tocar fuera; `aria-expanded` y `aria-controls` mantienen la
 * relación tecla-panel para el lector de pantalla.
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';

export type MobileMenuItem = {
  id: string;
  href: string;
  label: string;
  active?: boolean;
};

/**
 * Icono de hamburguesa: tres líneas del mismo trazo que el resto del panel.
 */
function BurgerGlyph() {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

/**
 * Icono de cierre, mismo trazo.
 */
function CloseGlyph() {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function MobileMenu({
  items,
  openLabel,
  closeLabel,
}: {
  items: MobileMenuItem[];
  openLabel: string;
  closeLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? closeLabel : openLabel}
        className="rounded-xs border border-groove bg-panel-raised p-2 text-silk-dim transition-colors hover:text-silk active:translate-y-px"
      >
        {open ? <CloseGlyph /> : <BurgerGlyph />}
      </button>

      {open ? (
        <nav
          id="mobile-menu"
          className="absolute inset-x-0 top-full border-t border-groove bg-panel-deep/95 shadow-[var(--shadow-drop)] backdrop-blur-sm"
        >
          <ul className="px-5 py-3">
            {items.map((item) => (
              <li key={item.id}>
                {item.href.startsWith('#') ? (
                  <a
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="plate-label block border-b border-groove/50 py-3.5 text-sm transition-colors last:border-b-0 hover:text-led-ink"
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    href={item.href as '/blog'}
                    onClick={() => setOpen(false)}
                    aria-current={item.active ? 'page' : undefined}
                    className={`plate-label block border-b border-groove/50 py-3.5 text-sm transition-colors last:border-b-0 hover:text-led-ink ${
                      item.active ? 'text-led-ink' : ''
                    }`}
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
