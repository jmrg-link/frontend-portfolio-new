/**
 * Placa de fabricante al pie: nombre del sitio, autor y derechos, en
 * registro de placa grabada — la chapa de "fabricado por" de toda máquina.
 * Se separa de la sección anterior con el mismo frente de onda que el resto
 * del panel, no con una línea recta.
 */
import { getTranslations } from 'next-intl/server';
import type { SiteSettings } from '@/lib/api/queries';
import { CodeTag, WaveFront } from './primitives';

export async function MakerPlate({ settings }: { settings: SiteSettings | null }) {
  const t = await getTranslations();
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden bg-panel-deep">
      <WaveFront previous="panel" />
      <div className="relative mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 pt-16 pb-8 md:px-8">
        <span className="text-sm">
          <CodeTag>JMRG</CodeTag>
        </span>
        <span className="plate-label">
          © {year} {settings?.author ?? 'JMRG'} · {t('footer.rights')}
        </span>
      </div>
    </footer>
  );
}
