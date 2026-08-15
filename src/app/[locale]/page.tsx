/**
 * Home del sitio público: compone el panel completo de la máquina con
 * los datos reales del backend (ocho lecturas en paralelo por locale). Toda
 * sección sin datos se retira sola — el panel nunca muestra huecos inventados.
 */
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import {
  getAbout,
  getExperiences,
  getFeaturedProjects,
  getHero,
  getPosts,
  getSiteSettings,
  getSkills,
  getTestimonials,
  type Locale,
} from '@/lib/api/queries';
import type { Metadata } from 'next';
import { getPathname } from '@/i18n/navigation';
import { MachineHeader } from '@/components/machine/header';
import { MachineHero } from '@/components/machine/hero';
import { AboutSpecs } from '@/components/machine/about';
import { SkillsMatrix } from '@/components/machine/skills';
import { ServiceLog } from '@/components/machine/experience';
import { ProductTrays } from '@/components/machine/work';
import { Receipts } from '@/components/machine/testimonials';
import { BlogFeed } from '@/components/machine/blog';
import { ContactKeypad } from '@/components/machine/contact';
import { MakerPlate } from '@/components/machine/footer';

export const revalidate = 1800;

/**
 * Canonical y hreflang de la home: `/es` y `/en` son la misma página; los
 * `languages` usan `getPathname` para respetar los pathnames localizados y
 * `x-default` apunta al locale por defecto.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  return {
    alternates: {
      canonical: getPathname({ locale, href: '/' }),
      languages: {
        es: getPathname({ locale: 'es', href: '/' }),
        en: getPathname({ locale: 'en', href: '/' }),
        'x-default': getPathname({ locale: routing.defaultLocale, href: '/' }),
      },
    },
  };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: requested } = await params;
  if (!hasLocale(routing.locales, requested)) {
    notFound();
  }
  setRequestLocale(requested);
  const locale = requested as Locale;

  const [settings, hero, about, skills, experiences, projects, testimonials, posts] =
    await Promise.all([
      getSiteSettings(locale),
      getHero(locale),
      getAbout(locale),
      getSkills(),
      getExperiences(locale),
      getFeaturedProjects(locale),
      getTestimonials(locale),
      getPosts(locale),
    ]);

  const t = await getTranslations();
  const railControls = {
    previous: t('rail.previous'),
    next: t('rail.next'),
    goTo: t('rail.goTo'),
  };

  return (
    <>
      <MachineHeader />
      <main id="main-content">
        <MachineHero hero={hero} settings={settings} />
        <AboutSpecs about={about} />
        <SkillsMatrix
          skills={skills}
          title={t('sections.skills.title')}
          railLabel={(category) => t('rail.skills', { category })}
          controls={railControls}
        />
        <ServiceLog
          experiences={experiences}
          title={t('sections.experience.title')}
          timelineLabel={t('rail.experienceTimeline')}
          controls={railControls}
        />
        <ProductTrays
          projects={projects}
          title={t('sections.work.title')}
          statusLabels={{
            completed: t('status.completed'),
            'in-progress': t('status.inProgress'),
          }}
          railLabel={t('rail.work')}
          controls={railControls}
          allLabel={t('rail.allProjects')}
        />
        <Receipts
          testimonials={testimonials}
          title={t('sections.testimonials.title')}
          railLabel={t('rail.testimonials')}
          controls={railControls}
        />
        <BlogFeed
          posts={posts}
          locale={locale}
          title={t('sections.blog.title')}
          allLabel={t('rail.allPosts')}
          positionLabel={t('machine.logPosition')}
        />
        <ContactKeypad settings={settings} title={t('sections.contact.title')} />
      </main>
      <MakerPlate settings={settings} />
    </>
  );
}
