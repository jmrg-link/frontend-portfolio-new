/**
 * Cabecera del panel: banda superior con el nombre serigrafiado, la botonera
 * de secciones, el conmutador de idioma como par de teclas ES/EN y, en móvil,
 * la tecla de hamburguesa que despliega el menú.
 *
 * La botonera cambia de destino según dónde esté. En la home son anclas a sus
 * secciones; fuera de ella un `#about` no apunta a nada —ese era el defecto: en
 * `/blog` y `/proyectos` la mitad del menú no hacía nada—, así que las secciones
 * pasan a enlazar la home con su ancla y las dos que tienen superficie propia,
 * blog y proyectos, van directas a su ruta.
 */
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { LocaleKeys } from './locale-keys';
import { ThemeToggle } from './theme-toggle';
import { MobileMenu } from './mobile-menu';
import { NavRail } from './nav-rail';
import { CodeTag } from './primitives';

/**
 * Superficie propia de cada entrada del menú, cuando la tiene. El resto son
 * secciones que solo existen dentro de la home.
 */
const SURFACES = { work: '/projects', blog: '/blog' } as const;

const SECTION_ANCHORS = [
  { id: 'about', key: 'about' },
  { id: 'skills', key: 'skills' },
  { id: 'experience', key: 'experience' },
  { id: 'work', key: 'work' },
  { id: 'blog', key: 'blog' },
  { id: 'contact', key: 'contact' },
] as const;

export type HeaderSection = keyof typeof SURFACES;

/**
 * Botón de sección de la botonera. Dentro de la home basta un ancla; fuera hay
 * que salir a la home o a la superficie propia, y por eso el destino se decide
 * aquí y no en el bucle.
 *
 * @param section - Superficie en la que está el visitante, si no es la home.
 */
function anchorHref(id: string, section?: HeaderSection): string {
  if (!section) return `#${id}`;
  if (id in SURFACES) return SURFACES[id as HeaderSection];
  return `/#${id}`;
}

export function MachineHeader({ section }: { section?: HeaderSection } = {}) {
  const t = useTranslations();

  return (
    <header className="sticky top-0 z-40 border-b border-groove bg-panel-deep/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-3.5 md:px-8">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-sm focus:bg-led focus:px-3 focus:py-1.5 focus:text-[#052e22]"
        >
          {t('a11y.skipToContent')}
        </a>
        <Link href="/" className="text-lg">
          <CodeTag>JMRG</CodeTag>
        </Link>
        <NavRail
          label={t('machine.sectionIndex')}
          onHome={!section}
          destinations={SECTION_ANCHORS.map(({ id, key }) => ({
            id,
            label: t(`nav.${key}`),
            href: anchorHref(id, section),
            active: id === section,
          }))}
        />
        <div className="flex items-center gap-3">
          <LocaleKeys label={t('a11y.switchLocale')} />
          <ThemeToggle label={t('a11y.toggleTheme')} />
          <MobileMenu
            items={SECTION_ANCHORS.map(({ id, key }) => ({
              id,
              href: anchorHref(id, section),
              label: t(`nav.${key}`),
              active: id === section,
            }))}
            openLabel={t('a11y.openMenu')}
            closeLabel={t('a11y.closeMenu')}
          />
        </div>
      </div>
    </header>
  );
}
