'use client';

/**
 * Campo de filamentos luminosos tras el hero: haces orgánicos de luz esmeralda
 * derivando despacio sobre el panel, al estilo del «NeuroNoise filament field»
 * de React Bits Pro (Hero 24), dibujado en canvas 2D propio en vez de WebGL.
 *
 * Presupuesto vigilado: ~7 curvas por frame a 30 fps y DPR limitado a 1.75.
 * Una única cadena de rAF que salta el dibujo cuando el hero está fuera del
 * viewport (el navegador ya pausa rAF solo en pestañas ocultas), sin
 * arrancar/parar el bucle: ese baile de cancelaciones es donde viven las
 * carreras. Con movimiento reducido se pinta un solo frame estático. El canvas
 * es decorativo (`aria-hidden`); sin JavaScript no está y el hero se lee igual.
 */
import { useEffect, useRef } from 'react';

const FILAMENTS = 7;
const FRAME_MS = 33;

type Filament = {
  seed: number;
  amplitude: number;
  speed: number;
  width: number;
  alpha: number;
};

/**
 * Genera los parámetros estables de cada filamento a partir de su índice, sin
 * aleatoriedad en render para que servidor y cliente no discrepen.
 */
function makeFilaments(): Filament[] {
  return Array.from({ length: FILAMENTS }, (_, i) => ({
    seed: i * 137.5,
    amplitude: 0.16 + (i % 3) * 0.07,
    speed: 0.00028 + (i % 4) * 0.00013,
    width: 1 + (i % 3),
    alpha: 0.07 + (i % 3) * 0.05,
  }));
}

/**
 * Dibuja un frame del campo: cada filamento es una polilínea suave cuyos
 * puntos ondulan con sumas de senos desfasadas por el tiempo.
 */
function draw(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  filaments: Filament[],
) {
  ctx.clearRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'lighter';

  for (const f of filaments) {
    ctx.beginPath();
    const points = 26;
    for (let p = 0; p <= points; p++) {
      const x = (p / points) * w * 1.1 - w * 0.05;
      const phase = t * f.speed + f.seed;
      const y =
        h * 0.5 +
        Math.sin(p * 0.35 + phase) * h * f.amplitude +
        Math.sin(p * 0.13 - phase * 1.7 + f.seed) * h * f.amplitude * 0.6;
      if (p === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(52, 211, 153, ${f.alpha})`;
    ctx.lineWidth = f.width;
    ctx.shadowColor = 'rgba(45, 212, 191, 0.55)';
    ctx.shadowBlur = 14;
    ctx.stroke();
  }
}

export function FilamentField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const filaments = makeFilaments();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let visible = true;
    let frameId = 0;
    let last = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(ctx, rect.width, rect.height, performance.now(), filaments);
    };

    const loop = (now: number) => {
      frameId = requestAnimationFrame(loop);
      if (!visible || now - last < FRAME_MS) return;
      last = now;
      const rect = canvas.getBoundingClientRect();
      draw(ctx, rect.width, rect.height, now, filaments);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
      },
      { threshold: 0.05 },
    );

    resize();
    observer.observe(canvas);
    window.addEventListener('resize', resize);
    if (!reduced) frameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
