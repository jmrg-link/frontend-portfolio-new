'use client';

import { useParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';

/**
 * Tecla de idioma: enlace a la ruta equivalente en el otro locale, con estado
 * pulsado para el activo.
 */
function LocaleKey({
  locale,
  active,
  href,
}: {
  locale: 'es' | 'en';
  active: boolean;
  href: Parameters<typeof Link>[0]['href'];
}) {
  return (
    <Link
      href={href}
      locale={locale}
      className={
        active
          ? 'plate-label rounded-xs border border-groove bg-panel-raised px-2 py-1 text-silk'
          : 'plate-label rounded-xs border border-transparent px-2 py-1 transition-colors hover:text-silk'
      }
    >
      {locale.toUpperCase()}
    </Link>
  );
}

/**
 * Par de teclas ES/EN del panel.
 *
 * Conserva la superficie y sus parámetros al cambiar de idioma —de un artículo
 * se pasa al mismo artículo, no a la portada— y el segmento localizado se
 * traduce solo: `/es/proyectos/x` sale a `/en/projects/x`. Es cliente porque
 * necesita la ruta actual, que en el servidor no está disponible.
 */
export function LocaleKeys({ label }: { label: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const params = useParams();
  const href = { pathname, params } as Parameters<typeof Link>[0]['href'];

  return (
    // biome-ignore lint/a11y/useSemanticElements: grupo de teclas de idioma; fieldset tendría semántica de formulario que aquí no existe
    <div role="group" className="flex items-center gap-1" aria-label={label}>
      <LocaleKey locale="es" active={locale === 'es'} href={href} />
      <LocaleKey locale="en" active={locale === 'en'} href={href} />
    </div>
  );
}
