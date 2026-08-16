/**
 * Ficha de un proyecto: la única lectura que trae `content`, convertido a HTML
 * en el servidor. Estado, fecha, especificaciones completas y los accesos al
 * repositorio y a la demo.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { renderMarkdown } from '@/lib/markdown';
import { routing } from '@/i18n/routing';
import { Link, getPathname } from '@/i18n/navigation';
import { ApiError } from '@/lib/api/client';
import {
  type Locale,
  type Project,
  getProject,
  getProjects,
  getSiteSettings,
} from '@/lib/api/queries';
import { absoluteUrl, buildAlternates, buildTwitter, localesWithSlug } from '@/lib/seo';
import { Led } from '@/components/machine/primitives';
import { JsonLd } from '@/components/machine/json-ld';
import { MachineHeader } from '@/components/machine/header';
import { MakerPlate } from '@/components/machine/footer';
import { resolveImageUrl } from '@/lib/images';
import { CmsImage } from '@/components/machine/cms-image';
import { MermaidRunner } from '@/components/machine/mermaid-runner';

export const revalidate = 600;

/**
 * Slugs que se prerenderizan en el build.
 *
 * Sin esta lista el `revalidate` de arriba es inerte: la ruta no entra en la caché completa y cada
 * visita reconstruye la ficha entera. El locale lo aporta el layout, así que aquí basta el slug;
 * los idiomas no son simétricos, de modo que se piden los de ambos y se deduplica.
 */
export async function generateStaticParams() {
  const porLocale = await Promise.all(routing.locales.map((locale) => getProjects(locale)));
  const slugs = new Set(porLocale.flat().map((project) => project.slug));
  return [...slugs].map((slug) => ({ slug }));
}

/**
 * Grafo schema.org de la ficha. El proyecto se describe como
 * `SoftwareSourceCode` porque sus campos reales son los de esa clase —
 * `tech` es `programmingLanguage` y `github` es `codeRepository`—, y la miga de
 * pan lo sitúa bajo el listado.
 *
 * @param project - Proyecto del locale, con `content` ya cargado.
 * @param locale - Locale de la página, que fija las URL canónicas del grafo.
 * @param labels - Textos traducidos de la home y de la sección para la miga de pan.
 * @param author - Autor declarado en `SiteSettings`; se omite si falta el singleton.
 * @returns Grafo listo para serializar en un `application/ld+json`.
 */
function buildProjectGraph(
  project: Project,
  locale: Locale,
  labels: { home: string; section: string },
  author?: string,
) {
  const homeUrl = absoluteUrl(getPathname({ locale, href: '/' }));
  const listUrl = absoluteUrl(getPathname({ locale, href: '/projects' }));
  const url = absoluteUrl(
    getPathname({ locale, href: { pathname: '/projects/[slug]', params: { slug: project.slug } } }),
  );
  const image = resolveImageUrl(project.image);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareSourceCode',
        '@id': url,
        name: project.title,
        description: project.description,
        url,
        inLanguage: locale,
        datePublished: project.date,
        programmingLanguage: project.tech,
        ...(image ? { image } : {}),
        ...(project.github ? { codeRepository: project.github } : {}),
        ...(author ? { author: { '@type': 'Person', name: author } } : {}),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: labels.home, item: homeUrl },
          { '@type': 'ListItem', position: 2, name: labels.section, item: listUrl },
          { '@type': 'ListItem', position: 3, name: project.title, item: url },
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
  const project = await getProject(slug, locale).catch(() => null);
  if (!project) return {};
  const ogImage = resolveImageUrl(project.image);
  return {
    title: project.title,
    description: project.description,
    alternates: buildAlternates(
      locale,
      { pathname: '/projects/[slug]', params: { slug } },
      await localesWithSlug(slug, getProjects),
    ),
    openGraph: {
      title: project.title,
      description: project.description,
      images: ogImage ? [ogImage] : undefined,
    },
    twitter: buildTwitter(project.title, project.description, ogImage),
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: requested, slug } = await params;
  if (!hasLocale(routing.locales, requested)) notFound();
  setRequestLocale(requested);
  const locale = requested as Locale;

  const project = await getProject(slug, locale).catch((error) => {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  });
  if (!project) notFound();

  const [settings, t] = await Promise.all([getSiteSettings(locale), getTranslations()]);
  const { html } = await renderMarkdown(project.content ?? '');
  const hasDiagrams = html.includes('mermaid-figure');
  const statusLabel =
    project.status === 'completed'
      ? t('status.completed')
      : project.status === 'in-progress'
        ? t('status.inProgress')
        : project.status;

  return (
    <>
      <JsonLd
        data={buildProjectGraph(
          project,
          locale,
          { home: t('nav.home'), section: t('sections.work.title') },
          settings?.author,
        )}
      />
      <MachineHeader section="work" />
      <main id="main-content" className="flex-1 bg-panel">
        <article className="mx-auto max-w-4xl px-5 pt-20 pb-24 md:px-8 md:pt-28">
          <Link href="/projects" className="plate-label hover:text-led-ink">
            ← {locale === 'es' ? 'Todos los proyectos' : 'All projects'}
          </Link>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Led on={project.status === 'completed'} label={statusLabel} />
            <time
              dateTime={project.date}
              className="font-spec text-xs tracking-wider text-selection"
            >
              {new Intl.DateTimeFormat(locale, {
                year: 'numeric',
                month: 'long',
              }).format(new Date(project.date))}
            </time>
          </div>

          <h1 className="mt-5 text-3xl leading-tight font-bold tracking-tight text-silk md:text-5xl">
            {project.title}
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-silk-dim">
            {project.description}
          </p>

          <p className="mt-6 font-spec text-xs leading-relaxed tracking-wider text-selection">
            {project.tech.join(' · ')}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {project.github ? (
              <a
                href={project.github}
                rel="noreferrer noopener"
                target="_blank"
                className="plate-label rounded-xs border border-groove bg-panel-raised px-4 py-2 transition-colors hover:border-led hover:text-led-ink active:translate-y-px"
              >
                GitHub
              </a>
            ) : null}
            {project.demo ? (
              <a
                href={project.demo}
                rel="noreferrer noopener"
                target="_blank"
                className="plate-label rounded-xs border border-groove bg-panel-raised px-4 py-2 transition-colors hover:border-led hover:text-led-ink active:translate-y-px"
              >
                Demo
              </a>
            ) : null}
          </div>

          <CmsImage
            src={project.image}
            alt=""
            width={1280}
            height={720}
            sizes="(min-width: 768px) 56rem, 100vw"
            preload
            className="mt-12 max-h-[70vh] w-full rounded-sm border border-groove bg-panel object-contain p-4"
            fallback={null}
          />

          {html ? (
            <div
              className="prose-panel mt-12"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: markdown propio del CMS, renderizado en servidor (regla de seguridad del repo)
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : null}
          {hasDiagrams ? <MermaidRunner /> : null}
        </article>
      </main>
      <MakerPlate settings={settings} />
    </>
  );
}
