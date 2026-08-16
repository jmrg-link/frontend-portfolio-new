import type { MetadataRoute } from 'next';
import { getPathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { getPosts, getProjects } from '@/lib/api/queries';
import { absoluteUrl } from '@/lib/seo';

type Locale = (typeof routing.locales)[number];

type Href = Parameters<typeof getPathname>[0]['href'];

/**
 * Una entrada de sitemap por ruta lógica, con sus dos idiomas declarados en
 * `alternates.languages`.
 *
 * Cada ruta aparece una sola vez —con la URL del locale por defecto como
 * canónica— en lugar de una entrada suelta por idioma, que es lo que hace que
 * Google trate es y en como páginas independientes.
 */
function entry(
  href: Href,
  lastModified?: string | Date,
  available: readonly Locale[] = routing.locales,
): MetadataRoute.Sitemap[number] {
  const canonical = available.includes(routing.defaultLocale)
    ? routing.defaultLocale
    : (available[0] ?? routing.defaultLocale);
  return {
    url: absoluteUrl(getPathname({ locale: canonical, href })),
    lastModified,
    alternates: {
      languages: Object.fromEntries(
        available.map((locale) => [locale, absoluteUrl(getPathname({ locale, href }))]),
      ),
    },
  };
}

/**
 * Slugs presentes en cualquiera de los dos idiomas, con la lista de locales en
 * los que existe cada uno.
 *
 * Los locales no son simétricos por diseño: un contenido publicado solo en
 * español entra igual, pero declarando únicamente ese idioma. Anunciar en el
 * sitemap una traducción que no existe manda a Google a un 404.
 */
async function slugsOf<T extends { slug: string }>(
  fetcher: (locale: Locale) => Promise<T[]>,
): Promise<{ item: T; locales: Locale[] }[]> {
  const perLocale = await Promise.all(
    routing.locales.map(async (locale) => ({ locale, items: await fetcher(locale) })),
  );
  const bySlug = new Map<string, { item: T; locales: Locale[] }>();
  for (const { locale, items } of perLocale) {
    for (const item of items) {
      const known = bySlug.get(item.slug);
      if (known) known.locales.push(locale);
      else bySlug.set(item.slug, { item, locales: [locale] });
    }
  }
  return [...bySlug.values()];
}

/**
 * Sitemap del sitio público: home, los dos listados y el detalle de cada post y
 * proyecto. Un fallo del API degrada a las rutas estáticas en lugar de tumbar
 * la generación.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const statics = [entry('/'), entry('/blog'), entry('/projects')];

  const [posts, projects] = await Promise.all([
    slugsOf(getPosts).catch(() => []),
    slugsOf(getProjects).catch(() => []),
  ]);

  return [
    ...statics,
    ...posts.map(({ item, locales }) =>
      entry(
        { pathname: '/blog/[slug]', params: { slug: item.slug } },
        item.date ?? undefined,
        locales,
      ),
    ),
    ...projects.map(({ item, locales }) =>
      entry({ pathname: '/projects/[slug]', params: { slug: item.slug } }, undefined, locales),
    ),
  ];
}
