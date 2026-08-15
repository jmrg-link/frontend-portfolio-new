/**
 * Primitivas de navegación conscientes del locale (Link, redirect, hooks),
 * derivadas del routing compartido. Sustituyen a las de `next/link`/`next/navigation`
 * en todo el sitio público.
 */
import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
