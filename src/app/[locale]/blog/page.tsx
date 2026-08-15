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
import { getPosts, type Locale } from '@/lib/api/queries';
import { MachineHeader } from '@/components/machine/header';
import { PostCard } from '@/components/machine/post-card';
import { EndlessPosts } from '@/components/machine/endless-posts';
import { MakerPlate } from '@/components/machine/footer';
import { getSiteSettings } from '@/lib/api/queries';

export const revalidate = 600;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'sections' });
  return { title: t('blog.title') };
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

  return (
    <>
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
          <EndlessPosts loadingLabel={t('pager.loading')}>
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
