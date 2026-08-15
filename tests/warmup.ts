import { request } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

/**
 * Rutas que la suite visita. Se piden una vez antes de empezar porque en `next dev` la primera
 * visita a cada ruta la compila, y esa compilación se come el margen de espera de los tests: con
 * el servidor recién levantado fallaban dos casos de detalle que pasaban al repetirlos. Calentar
 * es más honesto que subir el timeout hasta que deje de fallar.
 */
const ROUTES = [
  '/es',
  '/es/blog',
  '/es/proyectos',
  '/en',
  '/en/blog',
  '/en/projects',
];

/**
 * Pide cada ruta y, de los dos listados, también su primer detalle — que es otra ruta distinta y
 * por tanto otra compilación.
 *
 * @throws Si el servidor no responde; sin él la suite entera no tiene sentido.
 */
export default async function warmup() {
  const context = await request.newContext({ baseURL: BASE_URL });
  for (const route of ROUTES) {
    await context.get(route, { timeout: 120_000 });
  }
  for (const [list, prefix] of [
    ['/es/blog', '/es/blog/'],
    ['/es/proyectos', '/es/proyectos/'],
  ] as const) {
    const html = await (await context.get(list, { timeout: 120_000 })).text();
    const detail = html.match(new RegExp(`href="(${prefix}[^"]+)"`))?.[1];
    if (detail) await context.get(detail, { timeout: 120_000 });
  }
  await context.dispose();
}
