'use client';

/**
 * Cinta continua del display VFD: el mensaje que recorre el vidrio, como en la
 * pantalla de una máquina real. El movimiento es CSS puro —`translateX` sobre
 * contenido duplicado, que va en el compositor— y el texto accesible viaja en
 * un párrafo solo-lector, no en un `aria-label`, que ARIA prohíbe sobre
 * elementos genéricos.
 *
 * El botón de pausa es requisito de conformidad, no adorno: WCAG 2.2.2 (nivel
 * A) exige poder detener todo movimiento automático que dure más de cinco
 * segundos y se presente junto a otro contenido. `prefers-reduced-motion` no lo
 * sustituye, porque cubre a quien lo tiene configurado, no a quien lo necesita
 * en ese momento.
 */
import { useState } from 'react';

export type MarqueeProps = {
  text: string;
  /** Etiquetas de los controles, traducidas por el llamador. */
  controls: { pause: string; play: string };
};

export function Marquee({ text, controls }: MarqueeProps) {
  const [paused, setPaused] = useState(false);
  const line = `${text}   •   `;

  return (
    <div className="flex items-center gap-3">
      <div className="relative min-w-0 flex-1 overflow-hidden whitespace-nowrap">
        <p className="sr-only">{text}</p>
        <div
          aria-hidden
          className="vfd-marquee inline-block whitespace-nowrap text-sm md:text-base"
          style={paused ? { animationPlayState: 'paused' } : undefined}
        >
          {line}
          {line}
        </div>
      </div>
      <button
        type="button"
        onClick={() => setPaused((value) => !value)}
        aria-label={paused ? controls.play : controls.pause}
        className="shrink-0 rounded-xs border border-vfd-dim/50 px-2 py-1.5 text-vfd transition-colors hover:border-vfd active:translate-y-px"
      >
        {paused ? <PlayGlyph /> : <PauseGlyph />}
      </button>
    </div>
  );
}

/**
 * Glifo de pausa: dos barras, mismo trazo que el resto de controles del panel.
 */
function PauseGlyph() {
  return (
    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

/**
 * Glifo de reproducción, para restaurar el recorrido donde se detuvo.
 */
function PlayGlyph() {
  return (
    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5.5v13l11-6.5z" />
    </svg>
  );
}
