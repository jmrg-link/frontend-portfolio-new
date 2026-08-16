/**
 * Lectura de un artículo. El markdown del CMS se convierte a HTML en el
 * servidor, así que el cuerpo del texto no cuesta un solo byte de JavaScript en
 * el navegador y llega completo al indexador.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { getPathname } from '@/i18n/navigation';
import {
  OG_LOCALE,
  absoluteImage,
  absoluteUrl,
  buildAlternates,
  buildTwitter,
  localesWithSlug,
} from '@/lib/seo';
import { JsonLd } from '@/components/machine/json-ld';
import type { BlogPost } from '@/lib/api/queries';
import { Link } from '@/i18n/navigation';
import { ApiError } from '@/lib/api/client';
import { renderMarkdown } from '@/lib/markdown';
import { type Locale, getPost, getPosts, getSiteSettings } from '@/lib/api/queries';
import { MachineHeader } from '@/components/machine/header';
import { MakerPlate } from '@/components/machine/footer';
import { MermaidRunner } from '@/components/machine/mermaid-runner';
import { ArticleBar } from '@/components/machine/article-bar';
import { CmsImage } from '@/components/machine/cms-image';

export const revalidate = 600;

/**
 * Slugs que se prerenderizan en el build.
 *
 * Sin esta lista el `revalidate` de arriba es inerte: la ruta no entra en la caché completa y cada
 * visita vuelve a convertir el markdown y a resaltar el código. El locale lo aporta el layout, así
 * que aquí basta el slug; los idiomas no son simétricos, de modo que se piden los de ambos y se
 * deduplica.
 */
export async function generateStaticParams() {
  const porLocale = await Promise.all(routing.locales.map((locale) => getPosts(locale)));
  const slugs = new Set(porLocale.flat().map((post) => post.slug));
  return [...slugs].map((slug) => ({ slug }));
}

/** Ruta interna del artículo, tal como la esperan `buildAlternates` y `getPathname`. */
function postHref(slug: string) {
  return { pathname: '/blog/[slug]' as const, params: { slug } };
}

/** URL absoluta del artículo en el locale pedido, por su pathname localizado. */
function postUrl(locale: Locale, slug: string): string {
  return absoluteUrl(getPathname({ locale, href: postHref(slug) }));
}

/**
 * Grafo schema.org del artículo: el `BlogPosting` con sus fechas y su autoría,
 * más la miga de pan que lo sitúa bajo el listado. Sin `updatedAt` la fecha de
 * modificación cae en la de publicación, que es lo que el CMS garantiza.
 */
function postGraph(params: {
  locale: Locale;
  post: BlogPost;
  image: string | null;
  author: string | null;
  homeLabel: string;
  blogLabel: string;
}): Record<string, unknown> {
  const { locale, post } = params;
  const url = postUrl(locale, post.slug);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        '@id': `${url}#post`,
        url,
        mainEntityOfPage: url,
        headline: post.title,
        description: post.description,
        datePublished: post.date,
        dateModified: post.updatedAt ?? post.date,
        inLanguage: locale,
        ...(params.image ? { image: [params.image] } : {}),
        ...(post.tags.length ? { keywords: post.tags.join(', ') } : {}),
        ...(params.author ? { author: { '@type': 'Person', name: params.author } } : {}),
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: params.homeLabel,
            item: absoluteUrl(getPathname({ locale, href: '/' })),
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: params.blogLabel,
            item: absoluteUrl(getPathname({ locale, href: '/blog' })),
          },
          { '@type': 'ListItem', position: 3, name: post.title, item: url },
        ],
      },
    ],
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const post = await getPost(slug, locale as Locale).catch(() => null);
  if (!post) return {};
  const ogImage = absoluteImage(post.image);
  return {
    title: post.title,
    description: post.description,
    alternates: buildAlternates(locale, postHref(slug), await localesWithSlug(slug, getPosts)),
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.description,
      url: postUrl(locale, slug),
      locale: OG_LOCALE[locale],
      publishedTime: post.date,
      modifiedTime: post.updatedAt ?? post.date,
      authors: post.author ? [post.author] : undefined,
      tags: post.tags,
      images: ogImage ? [ogImage] : undefined,
    },
    twitter: buildTwitter(post.title, post.description, ogImage),
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: requested, slug } = await params;
  if (!hasLocale(routing.locales, requested)) notFound();
  setRequestLocale(requested);
  const locale = requested as Locale;

  const post = await getPost(slug, locale).catch((error) => {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  });
  if (!post) notFound();

  const settings = await getSiteSettings(locale);
  const t = await getTranslations();
  const { html, headings } = await renderMarkdown(post.content ?? '');
  const hasDiagrams = html.includes('mermaid-figure');
  const published = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(post.date));

  const graph = postGraph({
    locale,
    post,
    image: absoluteImage(post.image),
    author: post.author || settings?.author || null,
    homeLabel: t('nav.home'),
    blogLabel: t('nav.blog'),
  });

  return (
    <>
      <JsonLd data={graph} />
      <MachineHeader section="blog" />
      <ArticleBar
        headings={headings}
        surfaceHref="/blog"
        surfaceLabel={t('nav.blog')}
        homeLabel={t('nav.home')}
        title={post.title}
        indexLabel={t('machine.articleIndex')}
        breadcrumbLabel={t('machine.articleBreadcrumb')}
      />
      <main id="main-content" className="flex-1 bg-panel">
        <article className="mx-auto max-w-3xl px-5 pt-20 pb-24 md:px-8 md:pt-28">
          <Link href="/blog" className="plate-label hover:text-led-ink">
            ← {locale === 'es' ? 'Todas las entradas' : 'All posts'}
          </Link>

          <h1 className="mt-8 text-3xl leading-tight font-bold tracking-tight text-silk md:text-5xl">
            {post.title}
          </h1>

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
            <time dateTime={post.date} className="plate-label">
              {published}
            </time>
            {post.tags.map((tag) => (
              <span key={tag} className="font-spec text-[11px] tracking-wider text-selection">
                {tag}
              </span>
            ))}
          </div>

          <CmsImage
            src={post.image}
            alt=""
            width={1280}
            height={720}
            sizes="(min-width: 768px) 48rem, 100vw"
            preload
            className="mt-10 aspect-video w-full rounded-sm border border-groove object-cover"
          />

          <div
            className="prose-panel mt-12"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: markdown propio del CMS, renderizado en servidor (regla de seguridad del repo)
            dangerouslySetInnerHTML={{ __html: html }}
          />
          {hasDiagrams ? <MermaidRunner /> : null}
        </article>
      </main>
      <MakerPlate settings={settings} />
    </>
  );
}
