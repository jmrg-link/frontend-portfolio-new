'use client';

/**
 * Medición de campo de los Core Web Vitals con `useReportWebVitals`, el hook
 * que Next.js trae de serie (envuelve la librería web-vitals que ya viene en
 * el framework: cero dependencias nuevas, <1 KB de cliente). Lo monta el
 * layout raíz y no pinta nada.
 *
 * Hoy el destino es la consola: no existe endpoint RUM ni analítica. Cuando
 * la haya, este callback pasa a `navigator.sendBeacon` sin tocar el layout.
 */
import { useReportWebVitals } from 'next/web-vitals';

type VitalsMetric = Parameters<Parameters<typeof useReportWebVitals>[0]>[0];

/**
 * Imprime la métrica en una línea compacta: CLS es adimensional y va con tres
 * decimales; el resto son milisegundos y van redondeados.
 *
 * @param metric - Métrica emitida por web-vitals (LCP, CLS, INP, FCP, TTFB).
 */
function logMetric(metric: VitalsMetric) {
  const value = metric.name === 'CLS' ? metric.value.toFixed(3) : `${Math.round(metric.value)} ms`;
  console.info(`[vitals] ${metric.name} ${value} · ${metric.rating}`);
}

/**
 * Componente sin render que registra el reporte de Web Vitals del navegador.
 */
export function WebVitalsReporter() {
  useReportWebVitals(logMetric);
  return null;
}
