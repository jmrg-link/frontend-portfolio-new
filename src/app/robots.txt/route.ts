import { absoluteUrl } from '@/lib/seo';

export const dynamic = 'force-static';

/**
 * Agentes de IA que recogen contenido para entrenar modelos sin devolver
 * tráfico ni atribución. Se les niega el acceso; los de búsqueda y citación
 * —OAI-SearchBot, PerplexityBot, Claude-User, Claude-SearchBot, Googlebot y
 * Bingbot— no aparecen aquí y quedan cubiertos por la regla general.
 */
const ENTRENAMIENTO_SIN_ATRIBUCION = [
  'Amazonbot',
  'Applebot-Extended',
  'Bytespider',
  'CCBot',
  'GPTBot',
  'meta-externalagent',
];

/**
 * Rutas que no aportan nada a un índice: el panel privado y el API. Los
 * recursos de `/_next/` **no** se bloquean: Googlebot renderiza la página para
 * indexarla y sin su CSS ni su JavaScript la ve rota.
 */
const RUTAS_PRIVADAS = ['/admin', '/api/'];

/**
 * Directivas de rastreo del sitio público.
 *
 * Va como route handler y no como `robots.ts` porque `MetadataRoute.Robots` no
 * admite líneas arbitrarias, y aquí hace falta `Content-Signal`: la señal de
 * contentsignals.org que declara para qué puede usarse el contenido. Se
 * conceden búsqueda y respuesta generativa con atribución, y se reserva el
 * entrenamiento.
 *
 * @returns El `robots.txt` como texto plano, generado en el build.
 */
export function GET(): Response {
  const lineas = [
    'User-agent: *',
    'Content-Signal: search=yes, ai-input=yes, ai-train=no, use=reference',
    'Allow: /',
    ...RUTAS_PRIVADAS.map((ruta) => `Disallow: ${ruta}`),
    '',
    ...ENTRENAMIENTO_SIN_ATRIBUCION.flatMap((agente) => [
      `User-agent: ${agente}`,
      'Disallow: /',
      '',
    ]),
    `Sitemap: ${absoluteUrl('/sitemap.xml')}`,
    '',
  ];

  return new Response(lineas.join('\n'), {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}
