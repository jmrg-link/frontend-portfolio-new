/**
 * Cliente HTTP server-side del backend REST (`/api/v1`). La API es 100 %
 * privada: toda petición lleva Bearer. En dev local el token sale de
 * `GET /auth/dev-token` (cacheado hasta poco antes de su TTL de 3600 s); en
 * producción, de `BACKEND_API_TOKEN` (api_key/m2m de Clerk) — el dev-token
 * queda vetado fuera de loopback para que un env mal puesto falle alto en vez
 * de degradar en silencio. Solo se invoca desde RSC y route handlers — nunca
 * desde el navegador, para no exponer el token ni depender del CORS del
 * backend.
 */
import 'server-only';
import type { paths } from './schema';

const DEV_AUTH_FLAG = process.env.API_AUTH_DEV_TOKEN === 'true';

/**
 * Resuelve la base URL del backend. Sin `BACKEND_API_URL`, solo el modo dev
 * explícito (`API_AUTH_DEV_TOKEN=true`, lo ponen los scripts dev/build) cae al
 * localhost por defecto; en cualquier otro entorno se lanza en carga de módulo
 * para que el error aparezca junto a su causa y no en cada fetch.
 *
 * @returns Base URL absoluta del API, sin barra final.
 * @throws Error cuando falta `BACKEND_API_URL` fuera del modo dev explícito.
 */
function resolveBaseUrl(): string {
  const fromEnv = process.env.BACKEND_API_URL;
  if (fromEnv) return fromEnv;
  if (!DEV_AUTH_FLAG) {
    throw new Error('BACKEND_API_URL es obligatoria fuera de dev local');
  }
  return 'https://localhost:3001/api/v1';
}

const BASE_URL = resolveBaseUrl();

const DEV_TOKEN_SAFETY_WINDOW_MS = 5 * 60 * 1000;

/**
 * El dev-token se revalida por debajo de su TTL de 3600 s. Va cacheado y no
 * `no-store` a propósito: una lectura sin caché dentro del render saca la ruta
 * entera de la generación estática y dispara el TTFB de toda la página.
 */
const DEV_TOKEN_REVALIDATE_SECONDS = 3000;

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/**
 * Error de la API con el problem-details RFC 9457 del backend ya parseado.
 * Conserva `status` como dato para que las páginas mapeen 404 → `notFound()`
 * y 5xx → error boundary en vez de inspeccionar strings.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly title: string;
  readonly detail?: string;

  constructor(status: number, title: string, detail?: string) {
    super(detail ? `${status} ${title}: ${detail}` : `${status} ${title}`);
    this.name = 'ApiError';
    this.status = status;
    this.title = title;
    this.detail = detail;
  }
}

type DevTokenResponse =
  paths['/api/v1/auth/dev-token']['get']['responses']['200']['content']['application/json'];

let cachedDevToken: { token: string; expiresAt: number } | null = null;

/**
 * Decide si el endpoint de dev-token es utilizable: exige el flag explícito
 * `API_AUTH_DEV_TOKEN=true` Y un backend en loopback. La doble condición hace
 * el flag inocuo en despliegues reales (su backend no es loopback) y hace que
 * un despliegue sin `BACKEND_API_TOKEN` falle explícito en vez de autenticarse
 * por la puerta de dev. `NODE_ENV` no sirve de guarda: `next build` local
 * también corre como production.
 */
function devTokenAllowed(): boolean {
  if (!DEV_AUTH_FLAG) return false;
  return LOOPBACK_HOSTS.has(new URL(BASE_URL).hostname);
}

/**
 * Obtiene el bearer para el backend: `BACKEND_API_TOKEN` si está definido, o
 * el dev-token cacheado (renovado cinco minutos antes de caducar) cuando el
 * entorno lo permite.
 *
 * @param forceRefresh - Descarta el token en memoria y pide uno nuevo saltándose la caché de
 * datos. Necesario cuando el backend rechaza el token vigente: sin esto, la respuesta cacheada
 * devolvería el mismo token caducado y la petición seguiría fallando.
 * @returns Token listo para `Authorization: Bearer`.
 * @throws Error si no hay token estático y el dev-token no está permitido.
 * @throws ApiError si el endpoint de dev-token no responde 200.
 */
async function getToken(forceRefresh = false): Promise<string> {
  const staticToken = process.env.BACKEND_API_TOKEN;
  if (staticToken) return staticToken;

  if (!devTokenAllowed()) {
    throw new Error(
      'BACKEND_API_TOKEN es obligatorio fuera de dev local: el dev-token exige API_AUTH_DEV_TOKEN=true y backend en loopback',
    );
  }

  if (!forceRefresh && cachedDevToken && Date.now() < cachedDevToken.expiresAt) {
    return cachedDevToken.token;
  }

  const res = await fetch(
    `${BASE_URL}/auth/dev-token`,
    forceRefresh ? { cache: 'no-store' } : { next: { revalidate: DEV_TOKEN_REVALIDATE_SECONDS } },
  );
  if (!res.ok) {
    throw new ApiError(res.status, 'dev-token no disponible');
  }
  const body = (await res.json()) as DevTokenResponse;
  cachedDevToken = {
    token: body.token,
    expiresAt: Date.now() + body.expiresInSeconds * 1000 - DEV_TOKEN_SAFETY_WINDOW_MS,
  };
  return body.token;
}

/**
 * Política de caché de una petición, en términos del Data Cache de Next:
 * segundos de revalidación y tags para purga on-demand (`revalidateTag`).
 */
export type CachePolicy = {
  revalidate: number;
  tags?: string[];
};

/**
 * Convierte una respuesta no-2xx en `ApiError`, parseando el
 * `application/problem+json` del backend cuando viene.
 *
 * @param res - Respuesta fallida del backend.
 * @returns El `ApiError` listo para lanzar.
 */
async function toApiError(res: Response): Promise<ApiError> {
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/problem+json')) {
    const problem = (await res.json().catch(() => null)) as {
      title?: string;
      detail?: string;
    } | null;
    if (problem) {
      return new ApiError(res.status, problem.title ?? res.statusText, problem.detail);
    }
  }
  const text = await res.text().catch(() => '');
  return new ApiError(res.status, res.statusText, text || undefined);
}

/**
 * GET tipado contra el backend. `path` es relativo a `/api/v1` (ej. `/cms/hero`).
 *
 * @param path - Ruta relativa al prefijo del API.
 * @param query - Query params; los `undefined` se omiten.
 * @param cache - Política de caché del recurso; la fija cada query, no este cliente.
 * @returns El JSON de la respuesta, tipado por el llamador.
 * @throws ApiError con status y problem-details si la respuesta no es 2xx.
 */
export async function apiGet<T>(
  path: string,
  query?: Record<string, string | number | undefined>,
  cache: CachePolicy = { revalidate: 60 },
): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const request = async (token: string) =>
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: cache.revalidate, tags: cache.tags },
    });

  let res = await request(await getToken());

  if (res.status === 401) {
    cachedDevToken = null;
    res = await request(await getToken(true));
  }

  if (!res.ok) {
    throw await toApiError(res);
  }
  return (await res.json()) as T;
}
