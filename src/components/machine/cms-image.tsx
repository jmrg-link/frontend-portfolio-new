import Image, { type ImageProps } from 'next/image';
import type { ReactNode } from 'react';

import { resolveImageUrl } from '@/lib/images';

/**
 * Imagen que viene del CMS, con su ruta ya resuelta contra el origen que corresponda.
 *
 * Existe para que el guard viva en un solo sitio: antes cada superficie repetía la condición
 * `image?.startsWith('https://')` y, cuando el CMS pasó a servir rutas relativas, las cinco
 * fallaron a la vez y el sitio se quedó sin una sola imagen.
 *
 * @param src - Campo `image` tal cual llega del API, absoluto o relativo.
 * @param fallback - Qué pintar cuando no hay imagen. Por defecto nada; las fichas que reservan
 * el hueco para no desplazar el resto del layout pasan aquí su marcador.
 */
export function CmsImage({
  src,
  alt,
  fallback = null,
  ...props
}: Omit<ImageProps, 'src'> & { src: string | null | undefined; fallback?: ReactNode }) {
  const resolved = resolveImageUrl(src);
  if (!resolved) return fallback;
  return <Image src={resolved} alt={alt} {...props} />;
}
