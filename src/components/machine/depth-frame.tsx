'use client';

/**
 * Marco con profundidad: inclina su contenido siguiendo el puntero
 * (perspectiva + rotateX/rotateY con interpolación suave por rAF) y empuja la
 * capa marcada con `data-depth` en sentido contrario, de modo que la placa
 * flota sobre el vidrio. Adaptación del componente «depth-card» de React Bits
 * al panel — el único de su categoría sin dependencias; el resto arrastra
 * three/gsap/motion y el mundo los veta.
 *
 * Solo responde a ratón: en táctil no hay hover y el marco queda estático,
 * igual que con `prefers-reduced-motion`. El bucle de rAF corre únicamente
 * desde que entra el puntero hasta que la inclinación se asienta.
 */
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

const MAX_TILT_DEG = 5;
const CHIP_SHIFT_PX = 7;
const SMOOTHING = 0.12;
const SETTLED = 0.01;

export function DepthFrame({
  className = '',
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const innerRef = useRef<HTMLDivElement>(null);
  const target = useRef({ rx: 0, ry: 0 });
  const current = useRef({ rx: 0, ry: 0 });
  const frame = useRef(0);
  const running = useRef(false);
  const hovering = useRef(false);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const loop = () => {
    const inner = innerRef.current;
    if (!inner) return;
    current.current.rx += (target.current.rx - current.current.rx) * SMOOTHING;
    current.current.ry += (target.current.ry - current.current.ry) * SMOOTHING;
    const { rx, ry } = current.current;
    inner.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
    const chip = inner.querySelector<HTMLElement>('[data-depth]');
    if (chip) {
      chip.style.transform = `translate(${(ry / MAX_TILT_DEG) * CHIP_SHIFT_PX}px, ${(-rx / MAX_TILT_DEG) * CHIP_SHIFT_PX}px)`;
    }
    const settled = !hovering.current && Math.abs(rx) < SETTLED && Math.abs(ry) < SETTLED;
    if (settled) {
      inner.style.transform = '';
      if (chip) chip.style.transform = '';
      running.current = false;
      return;
    }
    frame.current = requestAnimationFrame(loop);
  };

  const start = () => {
    if (running.current) return;
    running.current = true;
    frame.current = requestAnimationFrame(loop);
  };

  const onMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    target.current = { rx: py * -2 * MAX_TILT_DEG, ry: px * 2 * MAX_TILT_DEG };
    hovering.current = true;
    start();
  };

  const onMouseLeave = () => {
    hovering.current = false;
    target.current = { rx: 0, ry: 0 };
    start();
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: inclinación decorativa solo-ratón; teclado y táctil quedan al margen a propósito
    <div
      className={className}
      style={{ perspective: '800px' }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      <div ref={innerRef} style={{ transformStyle: 'preserve-3d' }}>
        {children}
      </div>
    </div>
  );
}
