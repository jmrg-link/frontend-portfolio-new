/**
 * Root layout por locale del sitio público. Carga las tres voces del mundo
 * «Panel de máquina» (Archivo = serigrafía, Chivo Mono = specs, Doto = display
 * VFD), fija el contrato de dirección como primer hijo del body y valida el
 * segmento `[locale]`.
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

const DIRECTION_CONTRACT = `
THESIS: la home es el panel frontal de la maquina que JMRG opera (vending/HMI,
MDB/CCTalk); rechaza el portfolio-dev de hero con foto, grid de cards y badges.
OWN-WORLD: estructura de panel (bandejas con scroll-snap, codigos de seleccion,
display, tickets termicos) con acabado de ingenieria del sketch aprobado: fondo
#0b0f14, superficies #11161d elevadas por tono y borde, un solo acento esmeralda
#34d399 con apoyo cian #2dd4bf, radios 6/10/16, ondas SVG entre secciones y
rotulos verticales en el canto. Doto solo en el vidrio; Chivo Mono solo datos.
STORY: el visitante lee una maquina en servicio: quien es, que hace, prueba de
trabajo real, y contacta por el formulario o el correo directo.
FIRST VIEWPORT: placa de identificacion: nombre y titulo a gran escala, lampara
LED con disponibilidad real del CMS, marquesina del display con pausa, CTA
solido de CONTACTO.
FORM: panel de maquina de vending, candidato 5 de la lista propia, seed ba283870;
acabado revisado por peticion del usuario (2026-08-02, sketch 002-A esmeralda).
FINISH: unreviewed and undocumented is unfinished; this build ends with the
finish review, the verdict, and DESIGN.md
`;

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
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: script anti-flash estático y propio, justificado en su JSDoc */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="flex min-h-dvh flex-col bg-panel text-silk antialiased">
        <div
          hidden
          // biome-ignore lint/security/noDangerouslySetInnerHtml: comentario HTML estático del contrato de dirección, contenido propio
          dangerouslySetInnerHTML={{ __html: `<!--${DIRECTION_CONTRACT}-->` }}
        />
        <WebVitalsReporter />
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
