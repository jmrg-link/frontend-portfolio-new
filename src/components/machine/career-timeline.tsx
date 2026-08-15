'use client';

/**
 * Cronología profesional: la trayectoria como pista de selección horizontal,
 * única superficie de experiencia del sitio (vive en «Registro de servicio»).
 * Una sola ficha activa con el detalle completo —periodo, empresa, puesto y
 * tareas— y, debajo, un canal fresado con una posición por etapa: el
 * recorrido se rellena con luz LED hasta la etapa activa y una fila de mando
 * agrupa el periodo, la lectura de posición (`03/06`) y los pasos.
 * Adaptación del bloque «about-2» de React Bits Pro al mundo del panel: sin
 * autoplay (el panel se mueve a demanda), sin librería de animación (el cambio
 * de ficha es un keyframe CSS de opacity/transform) y con la lámpara LED
 * reservada al puesto en curso.
 *
 * Las etapas llegan del CMS ordenadas de más reciente a más antigua; aquí se
 * recorren de izquierda (origen) a derecha (hoy) y arranca activa la actual.
 * En táctil la ficha también se desliza (swipe) para cambiar de etapa; el
 * gesto es solo horizontal (`touch-pan-y`) para no robar el scroll vertical.
 */
import { useRef, useState } from 'react';
import type { Experience } from '@/lib/api/queries';
import { Led } from './primitives';

const SWIPE_MIN_PX = 44;

export function CareerTimeline({
  experiences,
  label,
  controls,
}: {
  experiences: Experience[];
  label: string;
  controls: { previous: string; next: string; goTo: string };
}) {
  const stages = [...experiences].reverse();
  const [active, setActive] = useState(stages.length - 1);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);

  if (stages.length === 0) return null;

  const onPointerDown = (event: React.PointerEvent) => {
    if (event.pointerType === 'mouse') return;
    swipeStart.current = { x: event.clientX, y: event.clientY };
  };

  const onPointerUp = (event: React.PointerEvent) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    setActive((current) => Math.min(stages.length - 1, Math.max(0, current - Math.sign(dx))));
  };

  const entry = stages[active];
  if (!entry) return null;
  const isCurrent = active === stages.length - 1;
  const fillPercent = ((active + 0.5) / stages.length) * 100;
  const position = `${String(active + 1).padStart(2, '0')}/${String(stages.length).padStart(2, '0')}`;

  return (
    // biome-ignore lint/a11y/useSemanticElements: role="group" con nombre es el patrón ACT elegido en F0; un landmark cambiaría la semántica
    <div role="group" aria-label={label}>
      <article
        key={entry._id ?? entry.company}
        aria-live="polite"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (swipeStart.current = null)}
        className="flex touch-pan-y flex-col rounded-sm border border-groove bg-panel-raised p-7 shadow-[var(--shadow-drop)] motion-safe:animate-[reveal-in_0.35s_ease-out] md:p-8"
      >
        <div className="flex items-center gap-3">
          <Led on={isCurrent} standby={isCurrent} />
          <span className="font-spec text-xs tracking-wider text-selection">{entry.period}</span>
        </div>
        <div className="mt-4 md:flex md:items-baseline md:justify-between md:gap-6">
          <h3 className="text-xl font-semibold tracking-tight text-silk md:text-2xl">
            {entry.company}
          </h3>
          <p className="mt-1 text-sm font-medium text-silk-dim md:mt-0 md:shrink-0">
            {entry.position}
          </p>
        </div>
        <ul className="mt-5 grid gap-x-10 gap-y-3 border-t border-groove pt-5 md:grid-cols-2">
          {entry.tasks.map((task) => (
            <li
              key={task.slice(0, 40)}
              className="flex gap-3 text-sm leading-relaxed text-silk-dim"
            >
              <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-selection" />
              {task}
            </li>
          ))}
        </ul>
      </article>

      <div className="mt-10">
        <div
          className="hidden sm:grid"
          style={{ gridTemplateColumns: `repeat(${stages.length}, 1fr)` }}
        >
          {stages.map((stage, index) => (
            <button
              key={stage._id ?? stage.company}
              type="button"
              onClick={() => setActive(index)}
              className={`truncate px-1 pb-4 text-center text-xs font-medium transition-colors ${
                index === active ? 'text-silk' : 'text-silk-dim hover:text-silk'
              }`}
            >
              {stage.company}
            </button>
          ))}
        </div>

        <div className="relative h-7">
          <span
            aria-hidden
            className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full border border-groove bg-panel-deep shadow-[inset_0_1px_3px_rgba(0,0,0,0.45)]"
          />
          <span
            aria-hidden
            className="absolute left-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-led-dim shadow-[0_0_10px_rgba(52,211,153,0.25)] motion-safe:transition-[width] motion-safe:duration-300 motion-safe:ease-out"
            style={{ width: `${fillPercent}%` }}
          />
          <div
            className="relative grid h-full"
            style={{ gridTemplateColumns: `repeat(${stages.length}, 1fr)` }}
          >
            {stages.map((stage, index) => (
              <button
                key={stage._id ?? stage.company}
                type="button"
                onClick={() => setActive(index)}
                aria-label={`${controls.goTo} ${index + 1}: ${stage.company}`}
                aria-current={index === active ? 'true' : undefined}
                className="grid place-items-center"
              >
                <span
                  aria-hidden
                  className={`rounded-full transition-all ${
                    index === active
                      ? 'size-3.5 bg-led shadow-[0_0_10px_rgba(52,211,153,0.65)] ring-4 ring-led/15'
                      : index < active
                        ? 'size-2 bg-led'
                        : 'size-2 border border-groove bg-panel'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 flex items-center gap-4">
          <span className="font-spec text-xs tracking-wider text-selection">{entry.period}</span>
          <span aria-hidden className="h-px flex-1 bg-groove" />
          <span className="font-spec text-xs tracking-widest text-silk-dim">{position}</span>
          <div className="flex gap-2">
            <StepArrow
              direction="start"
              label={controls.previous}
              disabled={active === 0}
              onClick={() => setActive(active - 1)}
            />
            <StepArrow
              direction="end"
              label={controls.next}
              disabled={active === stages.length - 1}
              onClick={() => setActive(active + 1)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Paso adelante/atrás de la pista. A diferencia de las flechas del riel, aquí
 * los extremos se deshabilitan: la trayectoria tiene principio y presente, no
 * da la vuelta.
 */
function StepArrow({
  direction,
  label,
  disabled,
  onClick,
}: {
  direction: 'start' | 'end';
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid size-9 place-items-center rounded-full border border-groove bg-panel-raised text-silk transition-colors hover:border-led hover:text-led-ink active:translate-y-px disabled:pointer-events-none disabled:opacity-30"
    >
      <svg
        aria-hidden="true"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={direction === 'start' ? { transform: 'scaleX(-1)' } : undefined}
      >
        <path d="M9 6l6 6-6 6" />
      </svg>
    </button>
  );
}
