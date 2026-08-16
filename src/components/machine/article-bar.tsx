'use client';

/**
 * Barra de lectura del artículo, bajo la cabecera: el rastro de dónde estás
 * (inicio → superficie → pieza) y el índice de sus apartados. En un texto largo
 * —aquí los hay con veintitantos bloques de código— la navegación útil no es la
 * del sitio sino la de dentro, y por eso esta banda sustituye a las secciones
 * de la home cuando se está leyendo.
 *
 * El índice se despliega en un panel para no robarle ancho al texto, marca el
 * apartado que se está leyendo con el mismo lenguaje de luz del panel y se
 * cierra al elegir, con Escape o al tocar fuera. Si el artículo no tiene
 * apartados, la barra se queda solo con el rastro en vez de mostrar un botón
 * que no lleva a ninguna parte.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';
import type { Heading } from '@/lib/markdown';

/**
 * Apartado que se está leyendo, para iluminarlo en el índice. Manda el último
 * encabezado que ha cruzado la banda superior: es el que titula lo que hay en
 * pantalla, aunque su propio título ya haya subido fuera de vista.
 *
 * @param ids - Anclas de los apartados, separadas por coma.
 */
function useReadingSection(ids: string): string {
  const [current, setCurrent] = useState('');

  useEffect(() => {
    const nodes = ids
      .split(',')
      .filter(Boolean)
      .map((id) => document.getElementById(id))
      .filter((node): node is HTMLElement => node !== null);
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      () => {
        const passed = nodes.filter((node) => node.getBoundingClientRect().top <= 120);
        setCurrent(passed.at(-1)?.id ?? '');
      },
      { rootMargin: '-100px 0px 0px 0px', threshold: [0, 1] },
    );
    for (const node of nodes) observer.observe(node);
    return () => observer.disconnect();
  }, [ids]);

  return current;
}

export function ArticleBar({
  headings,
  surfaceHref,
  surfaceLabel,
  homeLabel,
  title,
  indexLabel,
  breadcrumbLabel,
}: {
  headings: Heading[];
  surfaceHref: '/blog' | '/projects';
  surfaceLabel: string;
  homeLabel: string;
  title: string;
  indexLabel: string;
  breadcrumbLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);
  const current = useReadingSection(headings.map((heading) => heading.id).join(','));

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close(true);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open, close]);

  return (
    <div
      ref={rootRef}
      className="relative border-b border-groove bg-panel-deep/80 backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-2.5 md:px-8">
        <nav aria-label={breadcrumbLabel} className="flex min-w-0 items-center gap-2">
          <Link href="/" className="plate-label shrink-0 transition-colors hover:text-led-ink">
            {homeLabel}
          </Link>
          <span aria-hidden className="text-groove">
            /
          </span>
          <Link
            href={surfaceHref}
            className="plate-label shrink-0 transition-colors hover:text-led-ink"
          >
            {surfaceLabel}
          </Link>
          <span aria-hidden className="text-groove">
            /
          </span>
          <span className="truncate text-xs text-silk-dim">{title}</span>
        </nav>

        {headings.length > 0 ? (
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="article-index"
            className="plate-label shrink-0 rounded-xs border border-groove bg-panel-raised px-2.5 py-1.5 transition-colors hover:border-silk-dim hover:text-silk active:translate-y-px"
          >
            {indexLabel}
          </button>
        ) : null}
      </div>

      {open ? (
        <nav
          id="article-index"
          aria-label={indexLabel}
          className="absolute inset-x-0 top-full z-30 border-b border-groove bg-panel-deep/98 shadow-[var(--shadow-drop)] backdrop-blur-sm"
        >
          <ol className="mx-auto max-w-6xl px-5 py-3 md:px-8">
            {headings.map((heading, index) => (
              <li key={heading.id}>
                <a
                  href={`#${heading.id}`}
                  onClick={() => setOpen(false)}
                  aria-current={heading.id === current ? 'true' : undefined}
                  className={`flex items-baseline gap-3 border-b border-groove/50 py-2.5 text-sm transition-colors last:border-b-0 hover:text-led-ink ${
                    heading.id === current ? 'text-led-ink' : 'text-silk-dim'
                  }`}
                >
                  <span aria-hidden className="font-spec text-xs text-selection">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  {heading.text}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}
    </div>
  );
}
