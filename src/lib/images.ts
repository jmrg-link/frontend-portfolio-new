/**
 * Resolución de las imágenes del CMS. El backend guarda el campo `image` como ruta relativa
 * —`blog/introduccion-clean-code_9.png`, `projects/pokedex-next.png`, `logos/backend-express.jpg`—
 * heredada del monolito, donde resolvían contra su `public/`. Aquí no hay esos ficheros: se
 * sirven desde el CDN, que es exactamente lo que hace el sitio en producción
 * (`/_next/image?url=https%3A%2F%2Fimages.jmrg.dev%2Fblog%2F…`, verificado sobre el HTML
 * desplegado el 2026-08-15).
 *
 * Sin esto el frontal descartaba toda imagen que no fuera absoluta y el sitio se quedaba sin
 * una sola portada.
 */

/** Origen de las imágenes del CMS; el dominio de producción salvo que el entorno diga otro. */
const IMAGE_BASE_URL = process.env.NEXT_PUBLIC_IMAGE_BASE_URL ?? 'https://images.jmrg.dev';

/**
 * Convierte el `image` del CMS en una URL que `next/image` pueda optimizar.
 *
 * @param value - Campo `image` tal cual llega del API: absoluto, servido desde la raíz, relativo
 * al CDN, o ausente.
 * @returns URL lista para `src`, o `null` cuando no hay imagen — que es la señal para no
 * renderizar el elemento.
 */
export function resolveImageUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/'))
    return trimmed;
  return `${IMAGE_BASE_URL.replace(/\/$/, '')}/${trimmed.replace(/^\.?\//, '')}`;
}
