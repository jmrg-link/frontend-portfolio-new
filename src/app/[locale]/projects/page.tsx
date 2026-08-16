/**
 * Bandeja completa de productos: todos los proyectos publicados, con su
 * portada, su estado y sus especificaciones. Cada pieza enlaza a su ficha.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { Link, getPathname } from '@/i18n/navigation';
import { getProjects, getSiteSettings, type Locale, type Project } from '@/lib/api/queries';
import { absoluteUrl, buildAlternates, buildTwitter } from '@/lib/seo';
import { resolveImageUrl } from '@/lib/images';
import { Led } from '@/components/machine/primitives';
import { JsonLd } from '@/components/machine/json-ld';
import { MachineHeader } from '@/components/machine/header';
import { MakerPlate } from '@/components/machine/footer';
import { CmsImage } from '@/components/machine/cms-image';

export const revalidate = 600;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * URL absoluta de la ficha de un proyecto, resuelta contra el pathname
 * localizado (`/proyectos/[slug]` en es).
 *
 * @param slug - Slug del proyecto en el locale pedido.
 * @param locale - Locale que decide el segmento de la ruta.
 */
function projectUrl(slug: string, locale: Locale) {
  return absoluteUrl(
    getPathname({ locale, href: { pathname: '/projects/[slug]', params: { slug } } }),
  );
}

/**
 * Grafo schema.org del listado: la colección con sus piezas en el orden en que
 * se pintan, y la miga de pan que la sitúa bajo la home.
 *
 * @param projects - Proyectos publicados del locale, ya ordenados por el backend.
 * @param locale - Locale de la página, que fija las URL canónicas del grafo.
 * @param labels - Textos traducidos de la home y de la sección para la miga de pan.
 * @param description - Descripción del sitio desde el CMS; se omite si falta.
 * @returns Grafo listo para serializar en un `application/ld+json`.
 */
function buildProjectsGraph(
  projects: Project[],
  locale: Locale,
  labels: { home: string; section: string },
  description?: string,
) {
  const homeUrl = absoluteUrl(getPathname({ locale, href: '/' }));
  const listUrl = absoluteUrl(getPathname({ locale, href: '/projects' }));
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': listUrl,
        name: labels.section,
        url: listUrl,
        inLanguage: locale,
        ...(description ? { description } : {}),
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: projects.length,
          itemListElement: projects.map((project, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: project.title,
            url: projectUrl(project.slug, locale),
          })),
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: labels.home, item: homeUrl },
          { '@type': 'ListItem', position: 2, name: labels.section, item: listUrl },
        ],
      },
    ],
  };
}

/**
 * Metadata del listado: título de sección traducido, alternates por pathname
 * localizado y tarjetas sociales desde `SiteSettings`. Sin el singleton del CMS
 * se emite solo lo que no depende de contenido.
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
  const title = t('work.title');
  const alternates = buildAlternates(locale, '/projects');
  if (!settings) return { title, alternates };
  const ogImage = resolveImageUrl(settings.ogImage);
  return {
    title,
    description: settings.description,
    alternates,
    openGraph: {
      type: 'website',
      title,
      description: settings.description,
      url: absoluteUrl(getPathname({ locale, href: '/projects' })),
      siteName: settings.siteName,
      images: ogImage ? [ogImage] : undefined,
    },
    twitter: buildTwitter(title, settings.description, ogImage),
  };
}

export default async function ProjectsIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: requested } = await params;
  if (!hasLocale(routing.locales, requested)) notFound();
  setRequestLocale(requested);
  const locale = requested as Locale;

  const [projects, settings, t] = await Promise.all([
    getProjects(locale),
    getSiteSettings(locale),
    getTranslations(),
  ]);

  const statusLabels: Record<string, string> = {
    completed: t('status.completed'),
    'in-progress': t('status.inProgress'),
  };

  return (
    <>
      <JsonLd
        data={buildProjectsGraph(
          projects,
          locale,
          { home: t('nav.home'), section: t('sections.work.title') },
          settings?.description,
        )}
      />
      <MachineHeader section="work" />
      <main id="main-content" className="flex-1 bg-panel">
        <div className="mx-auto max-w-6xl px-5 pt-20 pb-24 md:px-8 md:pt-28">
          <h1 className="text-4xl font-bold tracking-tight text-silk md:text-5xl">
            {t('sections.work.title')}
          </h1>
          <div
            aria-hidden
            className="mt-4 mb-12 h-0.5 w-14 rounded-full bg-gradient-to-r from-led to-selection"
          />
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project, index) => (
              <li key={project._id ?? project.slug}>
                <Link
                  href={{
                    pathname: '/projects/[slug]',
                    params: { slug: project.slug },
                  }}
                  className="group flex h-full flex-col overflow-hidden rounded-sm border border-groove bg-panel-raised transition-colors hover:border-led/60"
                >
                  <CmsImage
                    src={project.image}
                    alt=""
                    width={640}
                    height={360}
                    sizes="(min-width: 1024px) 22rem, (min-width: 640px) 45vw, 90vw"
                    preload={index === 0}
                    className="aspect-video w-full border-b border-groove bg-panel object-contain p-3"
                    fallback={
                      <div
                        aria-hidden
                        className="aspect-video w-full border-b border-groove bg-panel"
                      />
                    }
                  />
                  <div className="flex flex-1 flex-col p-6">
                    <Led
                      on={project.status === 'completed'}
                      label={statusLabels[project.status] ?? project.status}
                    />
                    <h2 className="mt-4 text-lg font-semibold text-silk group-hover:text-led-ink">
                      {project.title}
                    </h2>
                    <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-silk-dim">
                      {project.description}
                    </p>
                    <p className="mt-4 font-spec text-[11px] leading-relaxed tracking-wider text-selection">
                      {project.tech.slice(0, 6).join(' · ')}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>
      <MakerPlate settings={settings} />
    </>
  );
}
