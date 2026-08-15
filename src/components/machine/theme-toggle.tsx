'use client';

/**
 * Interruptor día/noche del panel: tecla con iconos sol/luna dibujados en
 * SVG de trazo uniforme. Persiste en localStorage y conmuta la clase `light`
 * en <html>; el script anti-flash del layout aplica la preferencia antes del
 * primer paint. El estado se lee del DOM vía useSyncExternalStore para no
 * duplicar la fuente de verdad.
 */
import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'theme';

const listeners = new Set<() => void>();

/**
 * Suscripción del store de tema: los cambios los notifica `toggleTheme`.
 *
 * @param onChange - Callback de invalidación de React.
 * @returns Función de limpieza que retira la suscripción.
 */
function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

/**
 * Snapshot cliente: si el documento está en tema claro.
 */
function getSnapshot(): boolean {
  return document.documentElement.classList.contains('light');
}

/**
 * Snapshot de servidor: el default del mundo es noche.
 */
function getServerSnapshot(): boolean {
  return false;
}

/**
 * Conmuta la clase `light`, persiste la elección y notifica a los suscriptores.
 */
function toggleTheme(): void {
  const next = !document.documentElement.classList.contains('light');
  document.documentElement.classList.toggle('light', next);
  window.localStorage.setItem(STORAGE_KEY, next ? 'light' : 'dark');
  listeners.forEach((notify) => {
    notify();
  });
}

/**
 * Icono de sol: círculo con rayos, mismo trazo que el resto del sistema.
 */
function SunIcon() {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" />
    </svg>
  );
}

/**
 * Icono de luna: creciente del mismo trazo.
 */
function MoonIcon() {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}

/**
 * Tema activo del panel, leído del DOM sin duplicar la fuente de verdad. Lo
 * necesita cualquier pieza que deba seguir al tema desde JavaScript y no desde
 * CSS: el caso real es el widget de Turnstile, un iframe de Cloudflare que no
 * ve la clase `light` y con `theme: 'auto'` seguiría al sistema operativo.
 *
 * @returns `true` con el panel en día.
 */
export function useIsLightTheme(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function ThemeToggle({ label }: { label: string }) {
  const isLight = useIsLightTheme();
  const onToggle = useCallback(() => toggleTheme(), []);

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      className="rounded-xs border border-groove bg-panel-raised p-2 text-silk-dim transition-colors hover:text-silk active:translate-y-px"
    >
      {isLight ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}
