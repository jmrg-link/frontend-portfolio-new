'use client';

/**
 * Texto que se descifra como el display de la máquina resolviendo su rótulo:
 * los caracteres aún sin fijar parpadean en la luz esmeralda del panel y se
 * van bloqueando de izquierda a derecha. Inspirado en el `decrypted-text` de
 * React Bits, reescrito sin dependencias: un intervalo de ~30 ms durante ~1 s,
 * muy por debajo de los cinco segundos a partir de los cuales WCAG 2.2.2
 * exigiría control de pausa.
 *
 * Dos disparos: al montar (el arranque del hero) o al entrar en viewport con
 * retardo opcional (`playOnVisible` + `delayMs`), para que un registro de
 * varias líneas se imprima escalonado. El servidor emite siempre el texto
 * final —el LCP y el indexador ven el titular real— y con movimiento reducido
 * no se reproduce. El nombre accesible queda estable en un span solo-lector.
 *
 * El barajado nunca ocupa el flujo: la forma final reserva el hueco y los
 * glifos se pintan encima. Ocupándolo, el ancho variable de cada glifo
 * re-envolvía las líneas en cada fotograma y el CLS de la home saltaba de 0 a
 * 0,09–0,23 según la aleatoriedad de la tanda.
 */
import { Fragment, useEffect, useRef, useState } from 'react';

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&<>/*+=';

/**
 * Carácter aleatorio del set del display.
 */
function randomGlyph(): string {
  return GLYPHS.charAt(Math.floor(Math.random() * GLYPHS.length));
}

/**
 * Palabras del texto con el índice en el que arranca cada una, para repartir
 * entre ellas la cola revuelta sin perder la correspondencia posición ↔
 * carácter. La unidad es la palabra porque es donde el navegador decide el
 * salto de línea: fijando su ancho, el envoltorio del titular no cambia.
 */
function splitWords(text: string): Array<{ word: string; start: number }> {
  const words: Array<{ word: string; start: number }> = [];
  let start = 0;
  for (const word of text.split(' ')) {
    words.push({ word, start });
    start += word.length + 1;
  }
  return words;
}

/**
 * Palabra a medio descifrar: el texto final reserva su hueco en el flujo con
 * `visibility: hidden` —que conserva caja y línea base— y los glifos revueltos
 * se pintan sobre él en posición absoluta, recortados a ese ancho. El recorte
 * vive en la capa absoluta y no en la caja del flujo: un `inline-block` con
 * `overflow` distinto de `visible` cambia su línea base al borde inferior y
 * desalinearía la palabra respecto al resto del titular.
 *
 * @param word - Forma final, la que manda en la maquetación.
 * @param shown - Tramo visible en este fotograma, de la misma longitud.
 * @param fixed - Caracteres ya bloqueados, que se pintan en el color del texto.
 */
function DecryptingWord({ word, shown, fixed }: { word: string; shown: string; fixed: number }) {
  return (
    <span className="relative inline-block">
      <span className="invisible">{word}</span>
      <span className="absolute inset-0 overflow-hidden whitespace-nowrap">
        {shown.slice(0, fixed)}
        <span className="text-led-ink [text-shadow:0_0_14px_rgba(52,211,153,0.5)]">
          {shown.slice(fixed)}
        </span>
      </span>
    </span>
  );
}

export function DecryptedText({
  text,
  durationMs = 1200,
  playOnVisible = false,
  delayMs = 0,
}: {
  text: string;
  durationMs?: number;
  playOnVisible?: boolean;
  delayMs?: number;
}) {
  const [locked, setLocked] = useState(text.length);
  const [tail, setTail] = useState('');
  const rootRef = useRef<HTMLSpanElement>(null);
  const played = useRef(false);

  useEffect(() => {
    if (played.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      played.current = true;
      return;
    }

    const chars = [...text];
    let timer: ReturnType<typeof setInterval> | undefined;
    let delayTimer: ReturnType<typeof setTimeout> | undefined;

    const run = () => {
      if (played.current) return;
      played.current = true;
      const start = performance.now();
      timer = setInterval(() => {
        const progress = (performance.now() - start) / durationMs;
        const fixed = Math.min(chars.length, Math.floor(progress * chars.length));
        if (fixed >= chars.length) {
          setLocked(chars.length);
          setTail('');
          clearInterval(timer);
          return;
        }
        setLocked(fixed);
        setTail(
          chars
            .slice(fixed)
            .map((c) => (c === ' ' ? ' ' : randomGlyph()))
            .join(''),
        );
      }, 32);
    };

    const schedule = () => {
      delayTimer = setTimeout(run, delayMs);
    };

    let observer: IntersectionObserver | undefined;
    if (playOnVisible && rootRef.current) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            observer?.disconnect();
            schedule();
          }
        },
        { threshold: 0.4 },
      );
      observer.observe(rootRef.current);
    } else {
      schedule();
    }

    return () => {
      observer?.disconnect();
      clearTimeout(delayTimer);
      clearInterval(timer);
    };
  }, [text, durationMs, playOnVisible, delayMs]);

  const decoding = locked < text.length;
  const composed = text.slice(0, locked) + tail;

  return (
    <span ref={rootRef}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {decoding
          ? splitWords(text).map(({ word, start }, index) => (
              <Fragment key={start}>
                {index > 0 ? ' ' : null}
                <DecryptingWord
                  word={word}
                  shown={composed.slice(start, start + word.length)}
                  fixed={Math.min(word.length, Math.max(0, locked - start))}
                />
              </Fragment>
            ))
          : text}
      </span>
    </span>
  );
}
