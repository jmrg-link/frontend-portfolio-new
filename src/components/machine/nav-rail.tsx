'use client';

/**
 * Botonera de navegación con carro: los destinos van sobre un riel fresado y
 * un carro de luz se desliza hasta el que está activo. En la home el destino
 * activo lo decide el scroll —las secciones son anclas de la misma página, así
 * que el carro hace de indicador de posición—; fuera de ella lo decide la ruta,
 * y el carro se queda quieto sobre la superficie en la que estás.
 *
 * El carro es un solo elemento absoluto que viaja con `transform`, medido
 * contra el botón activo: es la traducción barata del indicador animado del
 * `navigation-15` de React Bits, sin `motion` ni JavaScript de scroll continuo
 * (el observador avisa, el navegador interpola). Con movimiento reducido el
 * carro salta en vez de deslizarse, y el nombre accesible del destino activo lo
 * marca `aria-current`, no el color.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';

export type NavDestination = {
  id: string;
  label: string;
  href: string;
  active?: boolean;
};

/**
 * Posición y ancho del carro, en píxeles del riel.
 */
type Carriage = { x: number; width: number } | null;

/**
 * Sección visible de la home, para que el carro siga al lector. Se queda con la
 * primera que cruza la banda superior del viewport: la que se está leyendo.
 *
 * @param ids - Identificadores separados por coma. Va como cadena y no como
 * array a propósito: un array nuevo en cada render reengancharía el observador
 * en bucle.
 * @param enabled - Solo en la home; fuera de ella manda la ruta.
 * @returns Identificador de la sección activa, o cadena vacía.
 */
function useVisibleSection(ids: string, enabled: boolean): string {
  const [visible, setVisible] = useState('');

  useEffect(() => {
    if (!enabled) return;
    const sections = ids
      .split(',')
      .map((id) => document.getElementById(id))
      .filter((node): node is HTMLElement => node !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setVisible(hit.target.id);
      },
      { rootMargin: '-20% 0px -70% 0px' },
    );
    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, [ids, enabled]);

  return visible;
}

export function NavRail({
  destinations,
  label,
  onHome,
}: {
  destinations: NavDestination[];
  label: string;
  onHome: boolean;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const [carriage, setCarriage] = useState<Carriage>(null);
  const ids = useMemo(
    () => destinations.map((destination) => destination.id).join(','),
    [destinations],
  );
  const visible = useVisibleSection(ids, onHome);

  const activeId = onHome
    ? visible
    : (destinations.find((destination) => destination.active)?.id ?? '');

  useLayoutEffect(() => {
    const rail = railRef.current;
    if (!rail || !activeId) {
      setCarriage(null);
      return;
    }
    const measure = () => {
      const target = rail.querySelector<HTMLElement>(`[data-destination="${activeId}"]`);
      if (!target) return setCarriage(null);
      setCarriage({ x: target.offsetLeft, width: target.offsetWidth });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(rail);
    return () => observer.disconnect();
  }, [activeId]);

  return (
    <nav aria-label={label} className="relative hidden items-center gap-1.5 lg:flex">
      <div ref={railRef} className="relative flex items-center gap-1.5">
        {destinations.map((destination) => {
          const active = destination.id === activeId;
          const className = `plate-label relative z-10 rounded-xs border px-2.5 py-1.5 transition-colors active:translate-y-px ${
            active
              ? 'border-led-dim text-led-ink'
              : 'border-groove hover:border-silk-dim hover:text-silk'
          }`;
          return destination.href.startsWith('#') ? (
            <a
              key={destination.id}
              data-destination={destination.id}
              href={destination.href}
              aria-current={active ? 'true' : undefined}
              className={className}
            >
              {destination.label}
            </a>
          ) : (
            <Link
              key={destination.id}
              data-destination={destination.id}
              href={destination.href as '/blog'}
              aria-current={destination.active ? 'page' : undefined}
              className={className}
            >
              {destination.label}
            </Link>
          );
        })}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 rounded-xs bg-panel-raised shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_16px_color-mix(in_srgb,var(--color-led)_35%,transparent)] transition-[transform,width,opacity] duration-300 ease-out motion-reduce:transition-none"
          style={{
            opacity: carriage ? 1 : 0,
            width: carriage ? `${carriage.width}px` : 0,
            transform: `translateX(${carriage?.x ?? 0}px)`,
          }}
        />
      </div>
    </nav>
  );
}
