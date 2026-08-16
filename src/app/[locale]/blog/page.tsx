/**
 * Registro completo del display: el listado de artículos, con su portada, sus
 * etiquetas y su fecha. Cada entrada enlaza a su lectura, que es lo que
 * convierte el blog en una superficie navegable y no en un resumen ciego.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { getPathname } from '@/i18n/navigation';
import { OG_LOCALE, absoluteImage, absoluteUrl, buildAlternates, buildTwitter } from '@/lib/seo';
import { JsonLd } from '@/components/machine/json-ld';
import { getPosts, type Locale } from '@/lib/api/queries';
import { MachineHeader } from '@/components/machine/header';
import { PostCard } from '@/components/machine/post-card';
import { EndlessPosts } from '@/components/machine/endless-posts';
import { MakerPlate } from '@/components/machine/footer';
import { getSiteSettings } from '@/lib/api/queries';

export const revalidate = 600;

/** URL absoluta del listado en el locale pedido, por su pathname localizado. */
function blogUrl(locale: Locale): string {
  return absoluteUrl(getPathname({ locale, href: '/blog' }));
}

/**
 * Grafo schema.org del listado: el `Blog` de este locale y la miga de pan que
 * lo sitúa bajo la home. Lo que el CMS no trae se omite en lugar de declararse
 * vacío, que para un validador es peor que no estar.
 */
function blogGraph(params: {
  locale: Locale;
  name: string;
  description: string;
  image: string | null;
  publisher: string | null;
  homeLabel: string;
  blogLabel: string;
}): Record<string, unknown> {
  const url = blogUrl(params.locale);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Blog',
        '@id': `${url}#blog`,
        url,
        name: params.name,
        inLanguage: params.locale,
        ...(params.description ? { description: params.description } : {}),
        ...(params.image ? { image: params.image } : {}),
        ...(params.publisher ? { publisher: { '@type': 'Person', name: params.publisher } } : {}),
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: params.homeLabel,
            item: absoluteUrl(getPathname({ locale: params.locale, href: '/' })),
          },
          { '@type': 'ListItem', position: 2, name: params.blogLabel, item: url },
        ],
      },
    ],
  };
}

/**
 * Metadata del listado: el título viene de las traducciones y la descripción y
 * la imagen social del singleton `SiteSettings` del locale, para que el texto
 * publicado siga saliendo del CMS.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const [t, settings] = await Promise.all([
    getTranslations({ locale, namespace: 'sections' }),
    getSiteSettings(locale).catch(() => null),
  ]);
  const title = t('blog.title');
  const description = settings?.description ?? '';
  const image = absoluteImage(settings?.ogImage);
  return {
    title,
    description,
    alternates: buildAlternates(locale, '/blog'),
    openGraph: {
      type: 'website',
      title,
      description,
      url: blogUrl(locale),
      locale: OG_LOCALE[locale],
      images: image ? [image] : undefined,
    },
    twitter: buildTwitter(title, description, image),
  };
}

export default async function BlogIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: requested } = await params;
  if (!hasLocale(routing.locales, requested)) notFound();
  setRequestLocale(requested);
  const locale = requested as Locale;

  const [posts, settings, t] = await Promise.all([
    getPosts(locale),
    getSiteSettings(locale),
    getTranslations(),
  ]);

  const graph = blogGraph({
    locale,
    name: t('sections.blog.title'),
    description: settings?.description ?? '',
    image: absoluteImage(settings?.ogImage),
    publisher: settings?.author ?? settings?.siteName ?? null,
    homeLabel: t('nav.home'),
    blogLabel: t('nav.blog'),
  });

  return (
    <>
      <JsonLd data={graph} />
      <MachineHeader section="blog" />
      <main id="main-content" className="flex-1 bg-panel">
        <div className="mx-auto max-w-6xl px-5 pt-20 pb-24 md:px-8 md:pt-28">
          <h1 className="text-4xl font-bold tracking-tight text-silk md:text-5xl">
            {t('sections.blog.title')}
          </h1>
          <div
            aria-hidden
            className="mt-4 mb-12 h-0.5 w-14 rounded-full bg-gradient-to-r from-led to-selection"
          />
          <EndlessPosts revealedLabel={t.raw('pager.revealed')}>
            {posts.map((post, index) => (
              <PostCard
                key={post._id ?? post.slug}
                post={post}
                locale={locale}
                preload={index === 0}
              />
            ))}
          </EndlessPosts>
        </div>
      </main>
      <MakerPlate settings={settings} />
    </>
  );
}
