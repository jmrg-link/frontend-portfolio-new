/**
 * 404 del sitio público como display de máquina sin señal. Texto bilingüe
 * estático a propósito: en un 404 el locale puede ser inválido y los mensajes
 * de next-intl no son cargables con seguridad; por lo mismo el enlace usa
 * `next/link` plano hacia la raíz (el middleware redirige al locale default).
 */
import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-panel px-5 text-center">
      <div className="rounded-sm border border-groove bg-vfd-glass px-8 py-6 shadow-[inset_0_2px_8px_rgba(0,0,0,0.7)]">
        <p className="font-vfd text-4xl font-bold text-vfd [text-shadow:0_0_8px_rgba(52,211,153,0.35)]">
          404 — SIN SEÑAL / NO SIGNAL
        </p>
      </div>
      <p className="max-w-md text-sm leading-relaxed text-silk-dim">
        Esta selección no existe en el panel. · This selection does not exist on the panel.
      </p>
      <Link
        href="/"
        className="rounded-sm bg-led px-8 py-4 text-sm font-bold tracking-[0.14em] text-[#052e22] uppercase shadow-[var(--shadow-drop)] transition-opacity hover:opacity-90 active:translate-y-px"
      >
        Volver al inicio / Back home
      </Link>
    </main>
  );
}
