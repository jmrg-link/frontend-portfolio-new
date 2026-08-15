'use client';

/**
 * Dibuja los diagramas mermaid del artículo. Mermaid mide texto contra el DOM,
 * así que no hay forma de resolverlo en el servidor: el markdown llega con el
 * diagrama resaltado como bloque de código y esta pieza lo sustituye por su SVG
 * cuando el bloque se acerca al viewport.
 *
 * Se carga con `import()` diferido y solo si la página trae diagramas: mermaid
 * es la dependencia más pesada del sitio y no debe entrar en el bundle de una
 * página que no lo use. El observador dispara antes de que el bloque sea
 * visible, para que el cambio de alto no desplace texto ya leído.
 *
 * Si algo falla —red, sintaxis del diagrama— no se toca nada y queda el bloque
 * de código, que sigue diciendo lo mismo en texto.
 */
import { useEffect } from 'react';
import { useIsLightTheme } from './theme-toggle';

const SELECTOR = '.mermaid-figure';

/**
 * Sustituye el contenido de una figura por el SVG de su diagrama.
 *
 * @param figure - Contenedor emitido por `renderMarkdown`, con la fuente del
 * diagrama en `data-mermaid`.
 * @param theme - Tema de mermaid que toca según el panel.
 */
async function drawDiagram(figure: HTMLElement, theme: 'dark' | 'default') {
  const source = decodeURIComponent(figure.dataset.mermaid ?? '');
  if (!source) return;

  const { default: mermaid } = await import('mermaid');
  mermaid.initialize({ startOnLoad: false, theme, securityLevel: 'strict' });

  const id = `mermaid-${Math.random().toString(36).slice(2, 10)}`;
  const { svg, bindFunctions } = await mermaid.render(id, source);
  figure.innerHTML = svg;
  bindFunctions?.(figure);
  figure.dataset.drawn = 'true';
}

export function MermaidRunner() {
  const isLight = useIsLightTheme();

  useEffect(() => {
    const figures = [...document.querySelectorAll<HTMLElement>(SELECTOR)];
    if (figures.length === 0) return;

    const theme = isLight ? 'default' : 'dark';
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const figure = entry.target as HTMLElement;
          observer.unobserve(figure);
          drawDiagram(figure, theme).catch(() => undefined);
        }
      },
      { rootMargin: '400px 0px' },
    );

    for (const figure of figures) {
      if (figure.dataset.drawn === 'true') continue;
      observer.observe(figure);
    }

    return () => observer.disconnect();
  }, [isLight]);

  return null;
}
