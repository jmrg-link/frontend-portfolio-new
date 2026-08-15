/**
 * Primitivas del mundo «Panel de máquina»: lámpara LED, display VFD,
 * sección-placa y código de selección. Todo el sitio público compone sobre
 * estas piezas para que el panel se lea como un solo objeto.
 */
import type { ReactNode } from 'react';

/**
 * Lámpara de estado. `on` enciende el LED verde con halo; apagada queda como
 * casquillo hundido en el panel. `standby` añade el pulso lento de máquina en
 * servicio (se apaga con prefers-reduced-motion).
 */
export function Led({
  on = true,
  standby = false,
  label,
}: {
  on?: boolean;
  standby?: boolean;
  label?: string;
}) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        aria-hidden
        className={
          on
            ? `size-2.5 rounded-full bg-led ${standby ? 'led-standby' : ''}`
            : 'size-2.5 rounded-full bg-led-dim'
        }
      />
      {label ? <span className="plate-label text-silk">{label}</span> : null}
    </span>
  );
}

/**
 * Franja de vidrio VFD: fondo casi negro con texto esmeralda en matriz de
 * puntos. El contenido se pasa ya compuesto (texto o marquesina).
 */
export function VfdGlass({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-sm border border-groove bg-vfd-glass px-4 py-2.5 shadow-[inset_0_2px_8px_rgba(0,0,0,0.7)]">
      <div className="font-vfd text-vfd [text-shadow:0_0_8px_rgba(52,211,153,0.35)]">
        {children}
      </div>
    </div>
  );
}

/**
 * Frente de onda que separa dos secciones: en lugar de una línea recta, el
 * fondo de la sección anterior invade la siguiente con una curva. El SVG se
 * duplica en horizontal para poder derivar en bucle sin costura, y la deriva
 * solo se activa sin preferencia de movimiento reducido.
 *
 * @param previous - Tono de la sección de arriba, que es lo que dibuja la onda.
 */
export function WaveFront({ previous }: { previous: 'panel' | 'deep' }) {
  const fill = previous === 'deep' ? 'var(--color-panel-deep)' : 'var(--color-panel)';
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-14 overflow-hidden md:h-20"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 2880 80"
        preserveAspectRatio="none"
        className="wave-drift h-full w-[200%]"
      >
        <path
          fill={fill}
          d="M0 0h2880v26c-160 0-260 26-420 26S2140 6 1980 6s-260 46-420 46S1300 0 1140 0 880 34 720 34 460 4 300 4 160 26 0 26Z"
        />
        <path
          fill="none"
          stroke="var(--color-groove)"
          strokeOpacity="0.6"
          vectorEffect="non-scaling-stroke"
          d="M2880 26c-160 0-260 26-420 26S2140 6 1980 6s-260 46-420 46S1300 0 1140 0 880 34 720 34 460 4 300 4 160 26 0 26"
        />
      </svg>
    </div>
  );
}

/**
 * Sección del panel: región de placa separada de la anterior por un frente de
 * onda, con rótulo vertical grabado en el canto y zonificación alternable
 * (`tone`). El título habla solo, sin eyebrow. El `id` ancla la navegación.
 */
export function PanelSection({
  id,
  title,
  tone = 'panel',
  sideLabel,
  children,
}: {
  id: string;
  title: string;
  tone?: 'panel' | 'deep';
  sideLabel?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={`relative scroll-mt-24 overflow-hidden ${tone === 'deep' ? 'bg-panel-deep' : 'bg-panel'}`}
    >
      <WaveFront previous={tone === 'deep' ? 'panel' : 'deep'} />
      <div className="relative mx-auto flex max-w-6xl gap-8 px-5 pt-24 pb-20 md:px-8 md:pt-32 md:pb-24">
        {sideLabel ? (
          <div
            aria-hidden
            className="hidden w-8 shrink-0 md:flex md:flex-col md:items-center md:gap-4"
          >
            <span className="plate-label [writing-mode:vertical-rl] rotate-180 whitespace-nowrap">
              {sideLabel}
            </span>
            <span className="w-px flex-1 bg-gradient-to-b from-groove to-transparent" />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <h2 className="text-3xl font-semibold tracking-tight text-silk md:text-4xl">{title}</h2>
          <div
            aria-hidden
            className="mt-4 mb-12 h-0.5 w-14 rounded-full bg-gradient-to-r from-led to-selection"
          />
          {children}
        </div>
      </div>
    </section>
  );
}

/**
 * Tecla física del panel: un botón de máquina con bisel (luz en el canto
 * superior, sombra en el inferior), halo de retroiluminación LED y recorrido
 * de pulsación —al pisarla viaja hacia abajo y su halo se comprime—. La
 * variante `primary` es la tecla de acción retroiluminada y lleva el destello
 * `cta-glint`: una banda de luz la recorre acompasada con el paso del escáner
 * láser del hero (mismo periodo, ver globals.css). `panel` es una tecla
 * fresada sin luz propia. Los degradados y halos derivan de `--color-led` con
 * `color-mix` para seguir al tema sin duplicar tokens.
 *
 * @param href - Destino del CTA. Con `href` sale un enlace; sin él, un
 * `<button>` —es lo que necesita el envío del formulario de contacto—.
 * @param glint - Apágalo donde el escáner del hero no esté a la vista: el
 * destello tiene sentido acompasado a algo visible, no como adorno suelto.
 */
export function PushButton({
  href,
  type,
  disabled,
  glint = true,
  variant = 'primary',
  className = '',
  children,
}: {
  href?: string;
  type?: 'submit' | 'button';
  disabled?: boolean;
  glint?: boolean;
  variant?: 'primary' | 'panel';
  className?: string;
  children: ReactNode;
}) {
  const base =
    'inline-flex items-center justify-center rounded-sm text-sm tracking-[0.14em] uppercase transition-[transform,box-shadow,border-color,color] duration-150 active:translate-y-[2px]';
  const variants = {
    primary:
      'relative overflow-hidden bg-[linear-gradient(to_bottom,color-mix(in_srgb,var(--color-led)_86%,white),color-mix(in_srgb,var(--color-led)_80%,black))] px-8 py-4 font-bold text-[#052e22] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),inset_0_-2px_0_rgba(0,0,0,0.3),0_0_18px_rgba(52,211,153,0.3),var(--shadow-drop)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.35),inset_0_-2px_0_rgba(0,0,0,0.3),0_0_28px_rgba(52,211,153,0.5),var(--shadow-drop)] active:shadow-[inset_0_1px_0_rgba(255,255,255,0.25),inset_0_-1px_0_rgba(0,0,0,0.3),0_0_10px_rgba(52,211,153,0.35)]',
    panel:
      'border border-groove bg-panel-raised px-6 py-4 font-semibold text-silk shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-2px_0_rgba(0,0,0,0.35),var(--shadow-drop)] hover:border-led-dim hover:text-led-ink active:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),inset_0_-1px_0_rgba(0,0,0,0.3)]',
  };
  const shell = `${base} ${variants[variant]} ${className}`;
  const face =
    variant === 'primary' && glint ? (
      <span aria-hidden className="cta-glint pointer-events-none absolute inset-y-0 left-0 w-1/3" />
    ) : null;

  if (href) {
    return (
      <a href={href} className={shell}>
        {face}
        {children}
      </a>
    );
  }

  return (
    <button type={type ?? 'button'} disabled={disabled} className={`${shell} disabled:opacity-60`}>
      {face}
      {children}
    </button>
  );
}

/**
 * Marca del sitio en forma de etiqueta de código (`<JMRG />`), heredada del
 * sitio en producción y traducida al mundo: la etiqueta es código, así que va
 * en la mono del panel con los ángulos en el cian de datos. Los ángulos son
 * decorativos (`aria-hidden`) para que el nombre accesible quede limpio.
 */
export function CodeTag({ children }: { children: ReactNode }) {
  return (
    <span className="font-spec font-bold tracking-tight text-silk">
      <span aria-hidden className="text-selection">
        &lt;
      </span>
      {children}
      <span aria-hidden className="ml-2 text-selection">
        /&gt;
      </span>
    </span>
  );
}

/**
 * Código de selección de vending (B1, F3…): la celda de precio/posición del
 * mundo, en el cian de datos.
 */
export function SelectionCode({ code }: { code: string }) {
  return <span className="font-vfd text-sm font-bold text-selection">{code}</span>;
}
