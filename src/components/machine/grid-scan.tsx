'use client';

/**
 * Pasillo de escaneo tras el hero: retícula en perspectiva de un punto
 * (suelo, techo y paredes de un conducto de máquina, a sangre completa por
 * aspecto) recorrida por un escáner láser de pistola de código de barras: la
 * fuente vive en el punto de fuga y proyecta un haz hasta el cabezal
 * vertical, que cruza el 100 % del ancho de izquierda a derecha a velocidad
 * constante revelando la retícula en su estela — la lectura horizontal que
 * pide la dirección vigente —. Inspirado en el «GridScan» de React Bits,
 * dibujado en canvas 2D propio en vez de WebGL: el original arrastra `three`
 * + `postprocessing` + `face-api.js`, y el plan tiene medido que three.js no
 * se justifica en el hero.
 *
 * Toda la animación vive dentro de un único recorte: el rectángulo del hero
 * más la banda de la onda separadora hasta su cresta. Cada frame se localiza
 * el SVG de la onda de la sección siguiente, se lee su geometría viva
 * (deriva incluida, sin adivinar tiempos de animación) y se añade su mismo
 * path al clip transformado a coordenadas del canvas: cabezal, haz, estela y
 * retícula continúan bajo el borde recto del hero y mueren exactamente en la
 * ondulación. Por eso el canvas sobresale (`h-[calc(100%+3.5rem/5rem)]`: un
 * canvas es un elemento reemplazado y `top`+`bottom` sin alto explícito no lo
 * estiran) y el
 * hero no recorta (`z-10`, sin `overflow-hidden`). Si la onda no se
 * encuentra, el recorte es el rectángulo del hero.
 *
 * Presupuesto vigilado: ~40 trazos por frame a 30 fps y DPR limitado a 1.75.
 * Una única cadena de rAF que salta el dibujo con el hero fuera del viewport.
 * Con movimiento reducido se pinta un solo frame con el haz congelado a un
 * tercio del ancho. El canvas es decorativo (`aria-hidden`); sin JavaScript
 * no está y el hero se lee igual.
 */
import { useEffect, useRef } from 'react';

const FRAME_MS = 33;
const FOCAL = 2;
const GRID_STEP = 0.24;
const NEAR_Z = 0.5;
const FAR_Z = 6;
const SCAN_DURATION_MS = 3600;
const SCAN_DELAY_MS = 1400;
const SCAN_TAIL_W = 280;

/**
 * Réplica exacta del path de `WaveFront` (`primitives.tsx`): la zona rellena
 * es la banda superior —color del hero— hasta la cresta. Si aquel path
 * cambia, este debe cambiar con él o la animación dejará de morir en la
 * cresta.
 */
const WAVE_PATH =
  'M0 0h2880v26c-160 0-260 26-420 26S2140 6 1980 6s-260 46-420 46S1300 0 1140 0 880 34 720 34 460 4 300 4 160 26 0 26Z';
const WAVE_VIEWBOX_W = 2880;
const WAVE_VIEWBOX_H = 80;

/**
 * Semiancho y semialto del conducto en unidades del mundo, derivados de la
 * geometría real del canvas para que paredes, suelo y techo salgan del
 * encuadre en el plano cercano — sin caja flotante en pantallas anchas — y
 * para que el suelo cubra también la banda extendida de la onda.
 */
function conduitHalfSize(w: number, hGrid: number, hFull: number): [number, number] {
  const halfW = (((w / hGrid) * NEAR_Z * 2) / (2 * FOCAL)) * 1.08;
  const halfH = (((hFull / hGrid - 0.44) * 2 * NEAR_Z) / FOCAL) * 1.04;
  return [halfW, halfH];
}

/**
 * Proyecta un punto del conducto (x, y, z en unidades del mundo) a pantalla
 * con perspectiva de un punto; el punto de fuga queda algo por encima del
 * centro para dar más presencia al suelo.
 */
function project(x: number, y: number, z: number, w: number, h: number): [number, number] {
  const scale = (FOCAL * h) / (2 * z);
  return [w / 2 + x * scale, h * 0.44 + y * scale];
}

/**
 * Dibuja el anillo de sección del conducto a una profundidad dada.
 */
function ring(
  ctx: CanvasRenderingContext2D,
  z: number,
  halfW: number,
  halfH: number,
  w: number,
  h: number,
) {
  const [x0, y0] = project(-halfW, -halfH, z, w, h);
  const [x1, y1] = project(halfW, halfH, z, w, h);
  ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
}

/**
 * Traza la retícula completa del conducto: anillos de sección desvaneciéndose
 * con la distancia y aristas longitudinales hacia el punto de fuga.
 *
 * @param boost - Multiplicador de alpha; la estela del escáner redibuja la
 * retícula con boost alto para «revelarla» a su paso.
 */
function drawGrid(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  halfW: number,
  halfH: number,
  boost: number,
) {
  ctx.lineWidth = 1;
  ctx.shadowBlur = 0;

  for (let z = NEAR_Z; z <= FAR_Z; z += GRID_STEP) {
    const alpha = Math.min(1, 0.17 * boost) * Math.exp(-z * 0.55);
    ctx.strokeStyle = `rgba(52, 211, 153, ${alpha})`;
    ring(ctx, z, halfW, halfH, w, h);
  }

  ctx.strokeStyle = `rgba(52, 211, 153, ${Math.min(1, 0.07 * boost)})`;
  for (let x = 0; x <= halfW + 1e-6; x += GRID_STEP / 2) {
    for (const sx of x === 0 ? [0] : [-x, x]) {
      for (const y of [-halfH, halfH]) {
        const [nx, ny] = project(sx, y, NEAR_Z, w, h);
        const [fx, fy] = project(sx, y, FAR_Z, w, h);
        ctx.beginPath();
        ctx.moveTo(nx, ny);
        ctx.lineTo(fx, fy);
        ctx.stroke();
      }
    }
  }
  for (let y = 0; y <= halfH + 1e-6; y += GRID_STEP / 2) {
    for (const sy of y === 0 ? [0] : [-y, y]) {
      for (const x of [-halfW, halfW]) {
        const [nx, ny] = project(x, sy, NEAR_Z, w, h);
        const [fx, fy] = project(x, sy, FAR_Z, w, h);
        ctx.beginPath();
        ctx.moveTo(nx, ny);
        ctx.lineTo(fx, fy);
        ctx.stroke();
      }
    }
  }
}

/**
 * Haz láser de la pistola: abanico de luz desde la fuente (el punto de fuga)
 * hasta los extremos del cabezal, más brillante junto a la fuente, con los
 * bordes del cono insinuados y el diodo encendido en el origen.
 */
function laserBeam(
  ctx: CanvasRenderingContext2D,
  w: number,
  hGrid: number,
  hFull: number,
  xs: number,
) {
  const cx = w / 2;
  const cy = hGrid * 0.44;
  const reach = Math.max(Math.abs(xs - cx), 1);

  const cone = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(reach, hGrid));
  cone.addColorStop(0, 'rgba(45, 212, 191, 0.16)');
  cone.addColorStop(1, 'rgba(45, 212, 191, 0.02)');
  ctx.fillStyle = cone;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(xs, 0);
  ctx.lineTo(xs, hFull);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(45, 212, 191, 0.22)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(xs, 0);
  ctx.moveTo(cx, cy);
  ctx.lineTo(xs, hFull);
  ctx.stroke();

  const diode = ctx.createRadialGradient(cx, cy, 0, cx, cy, 26);
  diode.addColorStop(0, 'rgba(45, 212, 191, 0.55)');
  diode.addColorStop(1, 'rgba(45, 212, 191, 0)');
  ctx.fillStyle = diode;
  ctx.fillRect(cx - 26, cy - 26, 52, 52);
}

/**
 * Dibuja un frame dentro del recorte hero+onda: la retícula tenue y, en fase
 * activa, el haz láser, la estela que revela la retícula y el cabezal. El
 * clip es quien corta todo en la cresta de la ondulación.
 *
 * @param scanPhase - Posición del barrido en [0, 1], o `null` si está en pausa.
 * @param clip - Región válida: rectángulo del hero más la banda de la onda.
 */
function draw(
  ctx: CanvasRenderingContext2D,
  w: number,
  hGrid: number,
  hFull: number,
  scanPhase: number | null,
  clip: Path2D,
) {
  ctx.clearRect(0, 0, w, hFull);
  ctx.save();
  ctx.clip(clip);

  const [halfW, halfH] = conduitHalfSize(w, hGrid, hFull);
  drawGrid(ctx, w, hGrid, halfW, halfH, 1);

  if (scanPhase !== null) {
    const tail = Math.min(SCAN_TAIL_W, w * 0.4);
    const xs = scanPhase * (w + tail) - tail / 2;

    const grad = ctx.createLinearGradient(xs - tail, 0, xs, 0);
    grad.addColorStop(0, 'rgba(45, 212, 191, 0)');
    grad.addColorStop(1, 'rgba(45, 212, 191, 0.08)');
    ctx.fillStyle = grad;
    ctx.fillRect(xs - tail, 0, tail, hFull);

    ctx.save();
    ctx.beginPath();
    ctx.rect(xs - tail, 0, tail, hFull);
    ctx.clip();
    drawGrid(ctx, w, hGrid, halfW, halfH, 4);
    ctx.restore();

    laserBeam(ctx, w, hGrid, hFull, xs);

    ctx.strokeStyle = 'rgba(45, 212, 191, 0.9)';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(45, 212, 191, 0.55)';
    ctx.shadowBlur = 26;
    ctx.beginPath();
    ctx.moveTo(xs, 0);
    ctx.lineTo(xs, hFull);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Fase del barrido para un instante dado: cruza el ancho durante
 * `SCAN_DURATION_MS`, descansa `SCAN_DELAY_MS` y vuelve a empezar.
 *
 * @returns La fase en [0, 1], o `null` durante la pausa entre pasadas.
 */
function phaseAt(now: number): number | null {
  const cycle = now % (SCAN_DURATION_MS + SCAN_DELAY_MS);
  if (cycle > SCAN_DURATION_MS) return null;
  return cycle / SCAN_DURATION_MS;
}

export function GridScan() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const wavePath = new Path2D(WAVE_PATH);
    const waveSvg = canvas.parentElement?.nextElementSibling?.querySelector('svg') ?? null;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let visible = true;
    let frameId = 0;
    let last = 0;

    const heights = () => {
      const rect = canvas.getBoundingClientRect();
      const parentH = canvas.parentElement?.getBoundingClientRect().height ?? rect.height;
      return [rect.width, Math.min(parentH, rect.height), rect.height] as const;
    };

    /**
     * Región válida del frame: el rectángulo del hero más, si la onda está
     * localizada, su banda hasta la cresta — el mismo path del SVG llevado a
     * coordenadas del canvas con su deriva actual.
     */
    const buildClip = (w: number, hGrid: number, hFull: number): Path2D => {
      const clip = new Path2D();
      clip.rect(0, 0, w, hGrid);
      if (waveSvg && hFull > hGrid) {
        const canvasRect = canvas.getBoundingClientRect();
        const svgRect = waveSvg.getBoundingClientRect();
        const matrix = new DOMMatrix()
          .translateSelf(svgRect.left - canvasRect.left, hGrid)
          .scaleSelf(svgRect.width / WAVE_VIEWBOX_W, (hFull - hGrid) / WAVE_VIEWBOX_H);
        clip.addPath(wavePath, matrix);
      }
      return clip;
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      const [w, hGrid, hFull] = heights();
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(hFull * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(
        ctx,
        w,
        hGrid,
        hFull,
        reduced ? 0.35 : phaseAt(performance.now()),
        buildClip(w, hGrid, hFull),
      );
    };

    const loop = (now: number) => {
      frameId = requestAnimationFrame(loop);
      if (!visible || now - last < FRAME_MS) return;
      last = now;
      const [w, hGrid, hFull] = heights();
      draw(ctx, w, hGrid, hFull, phaseAt(now), buildClip(w, hGrid, hFull));
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
      className="pointer-events-none absolute inset-x-0 top-0 h-[calc(100%+3.5rem)] w-full md:h-[calc(100%+5rem)]"
    />
  );
}
