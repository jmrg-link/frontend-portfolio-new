'use client';

/**
 * Error boundary del sitio público: la máquina fuera de servicio, con la tecla
 * de reintento. Bilingüe estático: si el fallo vino de la capa de datos, los
 * mensajes de next-intl pueden no estar disponibles.
 */
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-panel px-5 text-center">
      <div className="rounded-sm border border-groove bg-vfd-glass px-8 py-6 shadow-[inset_0_2px_8px_rgba(0,0,0,0.7)]">
        <p className="font-vfd text-3xl font-bold text-vfd [text-shadow:0_0_8px_rgba(52,211,153,0.35)]">
          FUERA DE SERVICIO / OUT OF ORDER
        </p>
      </div>
      <p className="max-w-md text-sm leading-relaxed text-silk-dim">
        La máquina no pudo completar la operación. · The machine could not complete the operation.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-sm bg-led px-8 py-4 text-sm font-bold tracking-[0.14em] text-[#052e22] uppercase shadow-[var(--shadow-drop)] transition-opacity hover:opacity-90 active:translate-y-px"
      >
        Reintentar / Retry
      </button>
    </main>
  );
}
