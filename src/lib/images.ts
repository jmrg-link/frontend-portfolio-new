/**
 * Resolución de las imágenes del CMS.
 *
 * El campo `image` de la API es una ruta relativa (`blog/x.png`, `projects/x.png`,
 * `logos/x.jpg`) que se sirve desde un CDN externo, no desde `public/` de esta aplicación.
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
