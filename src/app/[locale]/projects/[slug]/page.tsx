/**
 * Ficha de un proyecto: la única lectura que trae `content`, convertido a HTML
 * en el servidor. Estado, fecha, especificaciones completas y los accesos al
 * repositorio y a la demo.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { marked } from 'marked';

import { wrapTables } from '@/lib/markdown';
import { routing } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { ApiError } from '@/lib/api/client';
import { getProject, getSiteSettings, type Locale } from '@/lib/api/queries';
import { Led } from '@/components/machine/primitives';
import { MachineHeader } from '@/components/machine/header';
import { MakerPlate } from '@/components/machine/footer';
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
  const project = await getProject(slug, locale as Locale).catch(() => null);
  if (!project) return {};
  const ogImage = resolveImageUrl(project.image);
  return {
    title: project.title,
    description: project.description,
    openGraph: {
      title: project.title,
      description: project.description,
      images: ogImage ? [ogImage] : undefined,
    },
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
  const html = project.content ? wrapTables(await marked.parse(project.content)) : '';
  const statusLabel =
    project.status === 'completed'
      ? t('status.completed')
      : project.status === 'in-progress'
        ? t('status.inProgress')
        : project.status;

  return (
    <>
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
            priority
            className="mt-12 max-h-[70vh] w-full rounded-sm border border-groove bg-panel object-contain p-4"
          />

          {html ? (
            <div
              className="prose-panel mt-12"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: markdown propio del CMS, renderizado en servidor (regla de seguridad del repo)
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : null}
        </article>
      </main>
      <MakerPlate settings={settings} />
    </>
  );
}
