/**
 * Proxy (middleware) de Next: negocia el locale y reescribe los pathnames
 * localizados (`/proyectos` → `[locale]/projects`). Excluye API, internals y
 * archivos estáticos.
 */
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
};
