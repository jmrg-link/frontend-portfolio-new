/**
 * Enrutado i18n del sitio público: locales es/en con prefijo obligatorio y
 * pathnames localizados, paridad con el portfolio en producción. Lo consumen el
 * proxy (middleware), la request config y la navegación tipada.
 */
import { defineRouting } from 'next-intl/routing';

/**
 * Configuración de routing compartida por proxy, request config y navegación.
 * `localePrefix: 'always'` y `/projects` ↔ `/proyectos` son paridad con el sitio
 * viejo, no decisiones nuevas.
 */
export const routing = defineRouting({
  locales: ['es', 'en'],
  defaultLocale: 'es',
  localePrefix: 'always',
  pathnames: {
    '/': '/',
    '/blog': '/blog',
    '/blog/[slug]': '/blog/[slug]',
    '/projects': {
      es: '/proyectos',
      en: '/projects',
    },
    '/projects/[slug]': {
      es: '/proyectos/[slug]',
      en: '/projects/[slug]',
    },
  },
});
