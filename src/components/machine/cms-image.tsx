import Image, { type ImageProps } from 'next/image';
import type { ReactNode } from 'react';

import { resolveImageUrl } from '@/lib/images';

/**
 * Imagen del CMS con su ruta resuelta contra el origen que corresponda.
 *
 * Es el único punto que decide si una imagen del CMS es representable, de modo que un cambio en
 * el formato del campo `image` afecta a un solo sitio y no a cada superficie que la pinta.
 *
 * @param src - Campo `image` tal cual llega de la API, absoluto o relativo.
 * @param fallback - Qué pintar cuando no hay imagen resoluble. Por defecto nada; las fichas que
 * reservan el hueco para no desplazar el resto del layout pasan aquí su marcador.
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
