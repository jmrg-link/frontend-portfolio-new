/**
 * Root layout por locale del sitio público. Carga las tres voces del mundo
 * «Panel de máquina» (Archivo = serigrafía, Chivo Mono = specs, Doto = display
 * VFD) y valida el segmento `[locale]`.
 */
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Archivo, Chivo_Mono, Doto } from 'next/font/google';
import { routing } from '@/i18n/routing';
import { getSiteSettings, type Locale } from '@/lib/api/queries';
import { WebVitalsReporter } from '@/components/web-vitals-reporter';
import { InlineScript } from '@/components/machine/inline-script';
import '../globals.css';

const archivo = Archivo({
  subsets: ['latin'],
  variable: '--font-archivo',
  display: 'swap',
});

const chivoMono = Chivo_Mono({
  subsets: ['latin'],
  variable: '--font-chivo-mono',
  display: 'swap',
});

const doto = Doto({
  subsets: ['latin'],
  variable: '--font-doto',
  display: 'swap',
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/** Color de la UI del navegador: el grafito del panel (tema noche default). */
export const viewport = {
  themeColor: '#0c1017',
};

/**
 * Metadata por locale desde el CMS (SiteSettings); si el singleton aún no
 * existe, cae a los datos mínimos de marca.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const settings = await getSiteSettings(locale as Locale).catch(() => null);
  return {
    metadataBase: new URL(process.env.SITE_URL ?? 'https://jmrg.dev'),
    title: {
      default: settings?.siteTitle ?? 'JMRG.dev',
      template: '%s — JMRG',
    },
    description: settings?.description ?? '',
  };
}

const THEME_BOOT_SCRIPT = `
try {
  if (localStorage.getItem('theme') === 'light') {
    document.documentElement.classList.add('light');
  }
} catch (_) {}
`;

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${archivo.variable} ${chivoMono.variable} ${doto.variable}`}
    >
      <head>
        <InlineScript html={THEME_BOOT_SCRIPT} />
      </head>
      <body className="flex min-h-dvh flex-col bg-panel text-silk antialiased">
        <WebVitalsReporter />
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
