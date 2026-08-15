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
import { Link } from '@/i18n/navigation';
import { ApiError } from '@/lib/api/client';
import { renderMarkdown } from '@/lib/markdown';
import { getPost, getSiteSettings, type Locale } from '@/lib/api/queries';
import { MachineHeader } from '@/components/machine/header';
import { MakerPlate } from '@/components/machine/footer';
import { MermaidRunner } from '@/components/machine/mermaid-runner';
import { ArticleBar } from '@/components/machine/article-bar';
import { resolveImageUrl } from '@/lib/images';
import { CmsImage } from '@/components/machine/cms-image';

export const revalidate = 600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const post = await getPost(slug, locale as Locale).catch(() => null);
  if (!post) return {};
  const ogImage = resolveImageUrl(post.image);
  return {
    title: post.title,
    description: post.description,
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.description,
      publishedTime: post.date,
      images: ogImage ? [ogImage] : undefined,
    },
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

  return (
    <>
      <MachineHeader section="blog" />
      <ArticleBar
        headings={headings}
        surfaceHref="/blog"
        surfaceLabel={t('nav.blog')}
        homeLabel={t('nav.home')}
        title={post.title}
        indexLabel={t('machine.articleIndex')}
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
            priority
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
