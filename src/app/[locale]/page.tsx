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
  type SiteSettings,
} from '@/lib/api/queries';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getPathname } from '@/i18n/navigation';
import { OG_LOCALE, absoluteUrl, buildAlternates, buildTwitter } from '@/lib/seo';
import { resolveImageUrl } from '@/lib/images';
import { JsonLd } from '@/components/machine/json-ld';
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
import { SectionSkeleton } from '@/components/machine/section-skeleton';

export const revalidate = 1800;

/**
 * Grafo schema.org de la home: la persona detrás del sitio y el sitio mismo,
 * enlazados por `@id` para que no se indexen como entidades sueltas. `sameAs`
 * solo aparece con los perfiles que el CMS traiga.
 *
 * @param settings - Singleton `SiteSettings` del locale, ya comprobado no nulo.
 * @param locale - Locale de la página, que fija la URL canónica del grafo.
 * @returns Grafo listo para serializar en un `application/ld+json`.
 */
function buildHomeGraph(settings: SiteSettings, locale: Locale) {
  const url = absoluteUrl(getPathname({ locale, href: '/' }));
  const profiles = [settings.github, settings.linkedin, settings.manfred].filter(
    (profile): profile is string => Boolean(profile),
  );
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person',
        '@id': `${url}#person`,
        name: settings.author,
        url,
        ...(profiles.length > 0 ? { sameAs: profiles } : {}),
      },
      {
        '@type': 'WebSite',
        '@id': `${url}#website`,
        name: settings.siteName,
        description: settings.description,
        url,
        inLanguage: locale,
        publisher: { '@id': `${url}#person` },
      },
    ],
  };
}

/**
 * Canonical, hreflang y tarjetas sociales de la home. Los alternates salen de
 * los pathnames localizados; el resto viene de `SiteSettings`, y si el
 * singleton falta se emite solo lo que no depende del CMS.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const alternates = buildAlternates(locale, '/');
  const settings = await getSiteSettings(locale).catch(() => null);
  if (!settings) return { alternates };
  const ogImage = resolveImageUrl(settings.ogImage);
  return {
    alternates,
    openGraph: {
      type: 'website',
      title: settings.siteTitle,
      description: settings.description,
      url: absoluteUrl(getPathname({ locale, href: '/' })),
      siteName: settings.siteName,
      locale: OG_LOCALE[locale],
      images: ogImage ? [ogImage] : undefined,
    },
    twitter: buildTwitter(settings.siteTitle, settings.description, ogImage),
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
      {settings ? <JsonLd data={buildHomeGraph(settings, locale)} /> : null}
      <MachineHeader />
      <main id="main-content">
        <MachineHero hero={hero} settings={settings} />
        <AboutSpecs about={about} />
        <Suspense fallback={<SectionSkeleton />}>
          <SkillsMatrix
            skills={skills}
            title={t('sections.skills.title')}
            railLabel={(category) => t('rail.skills', { category })}
            controls={railControls}
          />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <ServiceLog
            experiences={experiences}
            title={t('sections.experience.title')}
            timelineLabel={t('rail.experienceTimeline')}
            controls={railControls}
          />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
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
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <Receipts
            testimonials={testimonials}
            title={t('sections.testimonials.title')}
            railLabel={t('rail.testimonials')}
            controls={railControls}
          />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <BlogFeed
            posts={posts}
            locale={locale}
            title={t('sections.blog.title')}
            allLabel={t('rail.allPosts')}
            positionLabel={t('machine.logPosition')}
            revealedLabel={t.raw('pager.revealed')}
          />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <ContactKeypad settings={settings} title={t('sections.contact.title')} />
        </Suspense>
      </main>
      <MakerPlate settings={settings} />
    </>
  );
}
