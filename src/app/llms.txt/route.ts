import { getPathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { getPosts, getProjects, getSiteSettings } from '@/lib/api/queries';
import { absoluteUrl } from '@/lib/seo';

export const dynamic = 'force-static';

type Locale = (typeof routing.locales)[number];

/**
 * Una entrada en el formato de llms.txt: enlace markdown con su descripción
 * detrás del guion.
 *
 * @param titulo - Texto del enlace.
 * @param ruta - Ruta ya localizada, relativa a la raíz del sitio.
 * @param descripcion - Frase que explica qué hay ahí; se recorta a una línea.
 * @returns La línea de lista lista para concatenar.
 */
function enlace(titulo: string, ruta: string, descripcion?: string): string {
  const cola = descripcion ? `: ${descripcion.replace(/\s+/g, ' ').trim().slice(0, 160)}` : '';
  return `- [${titulo}](${absoluteUrl(ruta)})${cola}`;
}

/**
 * Sección de un idioma con sus listados y su contenido publicado.
 *
 * @param locale - Idioma que se describe.
 * @returns Las líneas de esa sección, o solo sus listados si el API falla.
 */
async function seccion(locale: Locale): Promise<string[]> {
  const ruta = (href: Parameters<typeof getPathname>[0]['href']) => getPathname({ locale, href });
  const [posts, projects] = await Promise.all([
    getPosts(locale).catch(() => []),
    getProjects(locale).catch(() => []),
  ]);

  return [
    `## ${locale === 'es' ? 'Español' : 'English'}`,
    '',
    enlace(locale === 'es' ? 'Inicio' : 'Home', ruta('/')),
    enlace(locale === 'es' ? 'Proyectos' : 'Projects', ruta('/projects')),
    enlace('Blog', ruta('/blog')),
    '',
    `### ${locale === 'es' ? 'Proyectos' : 'Projects'}`,
    '',
    ...projects.map((p) =>
      enlace(
        p.title,
        ruta({ pathname: '/projects/[slug]', params: { slug: p.slug } }),
        p.description,
      ),
    ),
    '',
    `### ${locale === 'es' ? 'Artículos' : 'Articles'}`,
    '',
    ...posts.map((p) =>
      enlace(p.title, ruta({ pathname: '/blog/[slug]', params: { slug: p.slug } }), p.description),
    ),
    '',
  ];
}

/**
 * `llms.txt` del sitio: el índice en markdown que los asistentes leen para
 * resumir un dominio sin rastrearlo entero.
 *
 * Se genera en el build desde la misma API que alimenta las páginas, así que
 * no puede desalinearse del contenido publicado. Un fallo de lectura degrada a
 * los listados en lugar de tumbar la generación, igual que el sitemap.
 *
 * @returns El documento como texto plano.
 */
export async function GET(): Promise<Response> {
  const settings = await getSiteSettings(routing.defaultLocale).catch(() => null);
  const secciones = await Promise.all(routing.locales.map(seccion));

  const cuerpo = [
    `# ${settings?.siteTitle ?? 'jmrg.dev'}`,
    '',
    `> ${settings?.description ?? 'Portfolio de José Manuel Rodríguez: proyectos, artículos y experiencia en desarrollo backend y frontend.'}`,
    '',
    'El sitio se publica en español e inglés; cada página tiene su equivalente en el otro idioma.',
    'El contenido se sirve desde una API propia y se prerenderiza, así que estas rutas son estables.',
    '',
    ...secciones.flat(),
    '## Notas',
    '',
    '- Se permite indexar y citar con atribución; no se autoriza el entrenamiento de modelos.',
    `- Mapa completo de URLs: ${absoluteUrl('/sitemap.xml')}`,
    '',
  ].join('\n');

  return new Response(cuerpo, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
