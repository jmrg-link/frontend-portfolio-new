import type { Metadata } from 'next';
import { getPathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { resolveImageUrl } from '@/lib/images';

export type SeoLocale = (typeof routing.locales)[number];

type Locale = SeoLocale;

type Href = Parameters<typeof getPathname>[0]['href'];

/**
 * Canonical y hreflang de una ruta, resueltos contra los pathnames localizados.
 *
 * `href` es la ruta interna sin locale (`/blog`, o `{pathname, params}` para las
 * dinámicas). Devuelve el canonical del locale pedido y un `languages` con los
 * dos idiomas más `x-default` apuntando al locale por defecto, para que la misma
 * página en es y en no compita consigo misma.
 */
export function buildAlternates(
  locale: Locale,
  href: Href,
  available: readonly Locale[] = routing.locales,
): Metadata['alternates'] {
  const languages = Object.fromEntries(
    available.map((candidate) => [candidate, getPathname({ locale: candidate, href })]),
  );
  const fallback = available.includes(routing.defaultLocale) ? routing.defaultLocale : available[0];
  return {
    canonical: getPathname({ locale, href }),
    languages: {
      ...languages,
      ...(fallback ? { 'x-default': getPathname({ locale: fallback, href }) } : {}),
    },
  };
}

/**
 * Locales en los que existe una pieza de contenido, según el listado de cada
 * idioma.
 *
 * Los locales no son simétricos: hay contenido publicado solo en español. Un
 * `hreflang` que declare un idioma sin traducir apunta a un 404, así que se
 * declara únicamente lo que existe y la paridad se recupera sola en cuanto el
 * contenido se publique.
 *
 * @param slug - Identificador de la pieza, común a todos sus idiomas.
 * @param list - Lectura del listado completo de un locale, ya cacheada.
 * @returns Los locales con esa pieza; si la lectura falla, todos, para no
 * retirar un `hreflang` legítimo por un error transitorio del API.
 */
export async function localesWithSlug(
  slug: string,
  list: (locale: Locale) => Promise<{ slug: string }[]>,
): Promise<readonly Locale[]> {
  try {
    const found = await Promise.all(
      routing.locales.map(async (locale) => {
        const items = await list(locale);
        return items.some((item) => item.slug === slug) ? locale : null;
      }),
    );
    const present = found.filter((locale): locale is Locale => locale !== null);
    return present.length > 0 ? present : routing.locales;
  } catch {
    return routing.locales;
  }
}

/**
 * URL absoluta de una ruta interna, necesaria en JSON-LD y en OG, donde una ruta
 * relativa no vale.
 */
export function absoluteUrl(path: string): string {
  const base = (process.env.SITE_URL ?? 'https://jmrg.dev').replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Tarjeta de Twitter derivada del OG, con `summary_large_image` cuando hay
 * imagen y `summary` cuando no.
 */
export function buildTwitter(title: string, description: string, image?: string | null) {
  return {
    card: image ? ('summary_large_image' as const) : ('summary' as const),
    title,
    description,
    ...(image ? { images: [image] } : {}),
  };
}

/**
 * Etiqueta de idioma de Open Graph, que exige `idioma_PAÍS` y no admite el
 * código de locale a secas.
 */
export const OG_LOCALE: Record<Locale, string> = { es: 'es_ES', en: 'en_US' };

/**
 * Imagen del CMS como URL absoluta, que es la única forma que aceptan Open
 * Graph y JSON-LD.
 *
 * @param src - Campo de imagen tal cual llega del CMS.
 * @returns La URL absoluta, o `null` cuando no hay imagen que declarar.
 */
export function absoluteImage(src: string | null | undefined): string | null {
  const resolved = resolveImageUrl(src);
  if (!resolved) return null;
  return resolved.startsWith('/') ? absoluteUrl(resolved) : resolved;
}
