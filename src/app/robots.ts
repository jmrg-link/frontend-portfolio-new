import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/seo';

/**
 * Directivas de rastreo del sitio público.
 *
 * Se indexa todo salvo el panel y las rutas internas de Next; el sitemap se
 * anuncia en absoluto porque un `robots.txt` con ruta relativa no es válido.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api/', '/_next/'],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
