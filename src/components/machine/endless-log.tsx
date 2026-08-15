'use client';

/**
 * Registro que se desplaza dentro del vidrio VFD, como el display de una
 * máquina pasando su listado, y que va imprimiendo tandas nuevas conforme se
 * llega al final.
 *
 * El primer intento metió una caja con la barra de scroll del navegador dentro
 * del vidrio y rompía la pieza: un display es un objeto físico y no tiene
 * barras. Aquí el desplazamiento existe pero no se ve —la barra se oculta— y en
 * su lugar hablan dos elementos del propio mundo: los textos **se funden en los
 * cantos** con una máscara, como el fósforo que se apaga al salir del cristal, y
 * una **regla con carro LED** a la derecha marca por dónde va el registro, el
 * mismo recurso que el canal de la cronología.
 *
 * El servidor emite todas las filas y aquí solo se ocultan las que aún no
 * tocan: sin JavaScript el registro se lee entero desplazándolo, y el indexador
 * ve los enlaces de todas las entradas. Cada fila que se destapa entra con su
 * descifrado, porque `DecryptedText` se dispara al hacerse visible.
 */
import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

const BATCH = 4;

/** Suscripción vacía: estar en cliente no cambia tras el primer render. */
function neverChanges(): () => void {
  return () => {};
}

/**
 * Si el componente ya vive en el navegador, leído con `useSyncExternalStore`
 * para no fijar estado dentro de un efecto —que el lint del repo rechaza—.
 */
function useHydrated(): boolean {
  return useSyncExternalStore(
    neverChanges,
    () => true,
    () => false,
  );
}

/** Cuánto del registro queda por encima y por debajo de lo que se ve. */
type Travel = { progress: number; atStart: boolean; atEnd: boolean };

const START: Travel = { progress: 0, atStart: true, atEnd: false };

export function EndlessLog({
  children,
  positionLabel,
}: {
  children: ReactNode;
  positionLabel: string;
}) {
  const rows = Children.toArray(children);
  const hydrated = useHydrated();
  const [revealed, setRevealed] = useState(BATCH);
  const [travel, setTravel] = useState<Travel>(START);
  const windowRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const shown = hydrated ? Math.min(revealed, rows.length) : rows.length;

  useEffect(() => {
    const root = windowRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel || shown >= rows.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setRevealed((current) => Math.min(current + BATCH, rows.length));
        }
      },
      { root, rootMargin: '120px 0px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [shown, rows.length]);

  useEffect(() => {
    const root = windowRef.current;
    if (!root) return;
    const onScroll = () => {
      const max = root.scrollHeight - root.clientHeight;
      setTravel({
        progress: max > 0 ? root.scrollTop / max : 0,
        atStart: root.scrollTop <= 4,
        atEnd: max <= 0 || root.scrollTop >= max - 4,
      });
    };
    root.addEventListener('scroll', onScroll, { passive: true });
    return () => root.removeEventListener('scroll', onScroll);
  }, []);

  const fade = [
    travel.atStart ? null : 'to bottom, transparent 0, black 3rem',
    travel.atEnd ? null : 'to top, transparent 0, black 3rem',
  ].filter(Boolean) as string[];

  return (
    <div className="relative">
      <div
        ref={windowRef}
        className="max-h-[26rem] overflow-y-auto overscroll-contain pr-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={
          fade.length > 0
            ? {
                maskImage: fade.map((stop) => `linear-gradient(${stop})`).join(', '),
                maskComposite: 'intersect',
                WebkitMaskImage: fade.map((stop) => `linear-gradient(${stop})`).join(', '),
                WebkitMaskComposite: 'source-in',
              }
            : undefined
        }
      >
        <ul className="divide-y divide-vfd-dim/40">
          {rows.map((row, index) =>
            isValidElement<{ hidden?: boolean }>(row)
              ? cloneElement(row, { hidden: hydrated && index >= shown })
              : row,
          )}
        </ul>
        <div ref={sentinelRef} aria-hidden className="h-px" />
      </div>

      {hydrated && rows.length > BATCH ? (
        <div
          aria-hidden
          className="absolute inset-y-2 right-1 w-0.5 rounded-full bg-vfd-dim/25"
          title={positionLabel}
        >
          <span
            className="block h-10 w-full rounded-full bg-vfd shadow-[0_0_8px_rgba(52,211,153,0.6)] transition-transform duration-150 ease-out motion-reduce:transition-none"
            style={{
              transform: `translateY(calc(${travel.progress} * (26rem - 3.5rem)))`,
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
