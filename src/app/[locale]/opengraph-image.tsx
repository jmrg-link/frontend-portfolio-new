import { ImageResponse } from 'next/og';
import { hasLocale } from 'next-intl';
import { routing } from '@/i18n/routing';
import { getSiteSettings } from '@/lib/api/queries';
import type { Locale } from '@/lib/api/queries';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'JMRG.dev';

/**
 * Imagen de compartición por defecto, en el registro del panel: fondo de panel,
 * rótulo y una línea de LED esmeralda.
 *
 * Cubre las rutas sin imagen propia —home y los dos listados—, que sin esto se
 * comparten con la tarjeta en blanco. El detalle de post y proyecto declara la
 * suya desde el CMS y no pasa por aquí.
 */
export default async function OpengraphImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const settings = hasLocale(routing.locales, locale)
    ? await getSiteSettings(locale as Locale).catch(() => null)
    : null;

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: '#0c1017',
        padding: 72,
      }}
    >
      <div style={{ display: 'flex', fontSize: 28, color: '#8b98ab', letterSpacing: 6 }}>
        {(settings?.siteTitle ?? 'JMRG.DEV').toUpperCase()}
      </div>
      <div style={{ display: 'flex', fontSize: 64, color: '#e6edf3', lineHeight: 1.15 }}>
        {settings?.description ?? 'Backend, integraciones y sistemas embebidos'}
      </div>
      <div style={{ display: 'flex', height: 10, background: '#34d399', borderRadius: 6 }} />
    </div>,
    size,
  );
}
