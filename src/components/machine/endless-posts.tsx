'use client';

/**
 * Revelado por tandas del registro de artículos: el servidor pinta el listado
 * **entero** y esta pieza oculta lo que aún no toca, destapando una tanda más
 * cada vez que el pie de la lista se acerca.
 *
 * Se revela, no se pide. Dos motivos, los dos medidos: la paginación del
 * backend reparte mal cuando todas las entradas comparten fecha —12 artículos
 * únicos de 22, con 8 repetidos entre páginas—, y leer `searchParams` sacaba la
 * ruta de la generación estática. Con el listado completo en el HTML, el
 * rastreador ve los 22 enlaces sin depender de JavaScript —«Google's crawlers
 * don't "click" buttons and generally don't trigger JavaScript functions that
 * require user actions»— y las portadas de lo oculto no se descargan, porque
 * `next/image` difiere lo que no está en pantalla.
 *
 * Sin JavaScript se ve el listado completo de una vez, que es la degradación
 * correcta: más scroll, cero contenido perdido.
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

const BATCH = 9;

/**
 * Suscripción vacía: el dato que interesa —si ya estamos en el cliente— no
 * cambia nunca después del primer render, así que no hay a qué suscribirse.
 */
function neverChanges(): () => void {
  return () => {};
}

/**
 * Si el componente ya vive en el navegador. Se lee con `useSyncExternalStore`
 * y no con un efecto que fije estado: el servidor responde `false` —y por eso
 * emite la lista entera— y el cliente `true`, sin el render en cascada que la
 * regla del repo prohíbe.
 */
function useHydrated(): boolean {
  return useSyncExternalStore(
    neverChanges,
    () => true,
    () => false,
  );
}

/**
 * Rellena la plantilla del anuncio con la cuenta actual.
 *
 * Llega como texto y no como función porque un componente de servidor no puede pasar funciones a
 * uno de cliente, y traer el traductor hasta aquí arrastraría los mensajes al bundle.
 *
 * @param plantilla - Texto traducido con los marcadores `{shown}` y `{total}`.
 */
function formatRevealed(plantilla: string, shown: number, total: number): string {
  return plantilla.replace('{shown}', String(shown)).replace('{total}', String(total));
}

export function EndlessPosts({
  children,
  revealedLabel,
}: {
  children: ReactNode;
  /** Plantilla con los marcadores `{shown}` y `{total}`, ya traducida. */
  revealedLabel: string;
}) {
  const items = Children.toArray(children);
  const hydrated = useHydrated();
  const [revealed, setRevealed] = useState(BATCH);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const shown = hydrated ? Math.min(revealed, items.length) : items.length;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || shown >= items.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setRevealed((current) => Math.min(current + BATCH, items.length));
        }
      },
      { rootMargin: '600px 0px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [shown, items.length]);

  const pending = hydrated && shown < items.length;

  return (
    <>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((child, index) =>
          isValidElement<{ hidden?: boolean }>(child)
            ? cloneElement(child, { hidden: hydrated && index >= shown })
            : child,
        )}
      </ul>
      <div ref={sentinelRef} aria-hidden className="h-px" />
      <p aria-live="polite" className="plate-label mt-8 h-4 text-center">
        {pending ? formatRevealed(revealedLabel, shown, items.length) : ''}
      </p>
    </>
  );
}
