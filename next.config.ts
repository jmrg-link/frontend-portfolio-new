import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

/**
 * `allowedDevOrigins` (solo afecta a `next dev`): sin él, Next 16 bloquea las
 * peticiones cross-origin a los assets del dev server y un móvil accediendo
 * por IP LAN recibe el HTML pero no hidrata — sin JS: ni taps ni canvas.
 * Comodines por segmento (RFC 1035); cubren los rangos privados habituales.
 *
 * Bloque `images`, ajustado contra la documentación de la versión instalada
 * (`node_modules/next/dist/docs`, Next 16.2.12) y no de memoria:
 *
 * - `formats`: Next sirve WebP si no se declara. Con AVIF la misma portada baja
 *   de 30 KB a 22,7 KB. Es lo que ya hace el sitio en producción.
 * - `deviceSizes`: se recortan 2048 y 3840 del valor por defecto. Los originales
 *   del CMS son de 1024×1024, así que esos dos escalones solo pueden producir
 *   escalado por encima del original: más bytes para la misma imagen.
 * - `qualities`: obligatorio declararlo desde Next 16 —una lista abierta deja
 *   optimizar calidades no previstas—. `[75]` es el valor por defecto y el único
 *   que pide este sitio.
 * - `minimumCacheTTL`: 31 días. El CDN ya manda `immutable` con 30 días y Next
 *   toma el mayor de los dos, pero declararlo evita depender de esa cabecera.
 *   Contrapartida: **no hay invalidación de caché**; si se reemplaza una imagen
 *   conservando el nombre, se sigue sirviendo la vieja hasta que expire.
 */
const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*'],
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    qualities: [75],
    minimumCacheTTL: 2678400,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.jmrg.dev',
      },
    ],
  },
};

export default withNextIntl(nextConfig);
