/**
 * Bandeja completa de productos: todos los proyectos publicados, con su
 * portada, su estado y sus especificaciones. Cada pieza enlaza a su ficha.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { getProjects, getSiteSettings, type Locale } from '@/lib/api/queries';
import { Led } from '@/components/machine/primitives';
import { MachineHeader } from '@/components/machine/header';
import { MakerPlate } from '@/components/machine/footer';
import { CmsImage } from '@/components/machine/cms-image';

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
  return { title: t('work.title') };
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
            {projects.map((project) => (
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
                    className="aspect-video w-full border-b border-groove bg-panel object-contain p-3"
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
