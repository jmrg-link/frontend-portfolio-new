/**
 * Primer viewport: la placa de identificación de la máquina. Nombre y título
 * serigrafiados a gran escala con el posicionamiento completo como subhead
 * ESTÁTICO (la evidencia clave nunca vive solo en un elemento animado),
 * lámpara LED con la disponibilidad real del CMS, credencial de operario con
 * la foto de perfil servida por el worker de imágenes, marquesina VFD con la
 * oferta y el botón grande retroiluminado de CONTACTO. Todo el texto viene de
 * HeroContent/SiteSettings; nada inventado.
 */
import { getTranslations } from 'next-intl/server';
import type { HeroContent, SiteSettings } from '@/lib/api/queries';
import { Led, PushButton, VfdGlass } from './primitives';
import { Marquee } from './marquee';
import { DecryptedText } from './decrypted-text';
import { GridScan } from './grid-scan';

export async function MachineHero({
  hero,
  settings,
}: {
  hero: HeroContent | null;
  settings: SiteSettings | null;
}) {
  const t = await getTranslations();

  return (
    <section className="relative z-10 bg-panel-deep">
      <GridScan />
      <div className="relative mx-auto max-w-6xl px-5 pt-16 pb-14 md:px-8 md:pt-24 md:pb-20">
        <span className="boot-led inline-flex">
          <Led on standby label={hero?.availability ?? t('machine.statusOnline')} />
        </span>

        <div className="mt-10 max-w-4xl">
          <h1 className="text-5xl leading-[0.98] font-bold tracking-tight text-silk md:text-7xl">
            <DecryptedText text={hero?.greeting ?? 'JMRG'} />
          </h1>
          {settings?.siteTitle ? (
            <p className="mt-5 text-xl font-medium text-silk md:text-2xl">{settings.siteTitle}</p>
          ) : null}
          {settings?.description ? (
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-silk-dim">
              {settings.description}
            </p>
          ) : null}
        </div>

        {hero?.description ? (
          <div className="boot-vfd mt-10">
            <VfdGlass>
              <Marquee
                text={hero.description}
                controls={{ pause: t('machine.pause'), play: t('machine.play') }}
              />
            </VfdGlass>
          </div>
        ) : null}

        <div className="mt-12 flex flex-wrap items-center gap-4">
          <PushButton href="#contact" className="boot-cta">
            {t('machine.contactAction')}
          </PushButton>
        </div>
      </div>
    </section>
  );
}
