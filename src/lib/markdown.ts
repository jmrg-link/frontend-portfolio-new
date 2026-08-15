import 'server-only';

/**
 * Pipeline de contenido del CMS: markdown a HTML, resuelto entero en el
 * servidor. El resaltado lo pone Shiki, que emite el color de cada token como
 * estilo en línea —«the generated HTML contains inline style for each token, so
 * you don't need extra CSS to style it», shiki.style/guide/install—, así que la
 * página no carga ni un byte de JavaScript ni de CSS para pintar el código.
 *
 * Los dos temas viajan en el mismo HTML como variables `--shiki-light` y
 * `--shiki-dark`; quién gana lo decide `globals.css` por la clase `light` del
 * panel, no una media query, porque el tema aquí se conmuta a mano.
 */
import { Marked, type Token, type Tokens } from 'marked';
import { createSlugger } from './adapters/slug';
import { codeToHtml } from 'shiki';

const THEMES = { light: 'github-light', dark: 'github-dark-default' } as const;

/** Encabezado de segundo nivel del artículo, con el ancla que lo alcanza. */
export type Heading = { id: string; text: string };

/** HTML del artículo y su índice, que alimenta la barra de lectura. */
export type RenderedMarkdown = { html: string; headings: Heading[] };

/**
 * Lenguaje que Shiki entiende. Un `lang` desconocido haría fallar el resaltado
 * entero, y un artículo sin pintar es peor que un bloque sin colorear: lo que
 * no está en la lista cae a texto plano.
 */
const KNOWN_LANGS = new Set([
  'typescript',
  'ts',
  'tsx',
  'javascript',
  'js',
  'jsx',
  'json',
  'bash',
  'shell',
  'sh',
  'yaml',
  'yml',
  'sql',
  'html',
  'css',
  'python',
  'java',
  'go',
  'rust',
  'php',
  'docker',
  'dockerfile',
  'diff',
  'markdown',
  'md',
  'mermaid',
  'text',
]);

/**
 * Resalta un bloque con Shiki, o lo devuelve como texto plano si el lenguaje no
 * está soportado. Nunca lanza: el contenido debe llegar a la página aunque el
 * resaltado falle.
 *
 * @param code - Código fuente del bloque, ya sin las vallas de markdown.
 * @param lang - Lenguaje declarado en la valla; vacío si no se declaró.
 * @returns HTML del bloque, con `<pre class="shiki">` de Shiki.
 */
async function highlight(code: string, lang: string): Promise<string> {
  const normalized = lang.toLowerCase().trim();
  const resolved = KNOWN_LANGS.has(normalized) ? normalized : 'text';
  try {
    return await codeToHtml(code, {
      lang: resolved,
      themes: THEMES,
      defaultColor: false,
    });
  } catch {
    return await codeToHtml(code, { lang: 'text', themes: THEMES, defaultColor: false });
  }
}

/**
 * Envuelve cada tabla en un contenedor desplazable. Una tabla del CMS con celdas anchas
 * —rutas, fragmentos de código— desborda el viewport en móvil y arrastra la página entera en
 * horizontal (medido: 153 px de desbordamiento a 360 px de ancho). El contenedor lleva
 * `tabindex` porque una región con scroll que no es alcanzable con el teclado deja el contenido
 * fuera de alcance de quien no usa ratón.
 *
 * Se resuelve sobre el HTML ya generado, no con un renderer propio: `marked` no expone el
 * renderer base para post-procesarlo, y GFM no admite tablas anidadas, así que la sustitución
 * por pares es inequívoca.
 *
 * @param html - HTML producido por `marked`.
 * @returns El mismo HTML con cada `<table>` dentro de su contenedor desplazable.
 */
export function wrapTables(html: string): string {
  return html
    .replaceAll('<table>', '<div class="table-scroll" tabindex="0"><table>')
    .replaceAll('</table>', '</table></div>');
}

/**
 * Convierte el markdown del CMS en HTML listo para inyectar.
 *
 * El resaltado es asíncrono, y marked solo espera funciones asíncronas con la
 * opción `async` activada (marked.js.org/using_pro): sin ella devolvería el
 * HTML antes de que Shiki termine. Cada token de código se sustituye por su
 * HTML ya resaltado.
 *
 * @param md - Markdown tal cual lo sirve la API.
 * @returns HTML confiable —contenido propio del CMS, no de terceros— para
 * `dangerouslySetInnerHTML`.
 */
export async function renderMarkdown(md: string): Promise<RenderedMarkdown> {
  const instance = new Marked({ async: true, gfm: true });
  const headings: Heading[] = [];
  const slugger = createSlugger();

  instance.use({
    renderer: {
      heading({ tokens, depth }) {
        const text = this.parser.parseInline(tokens);
        if (depth !== 2) return `<h${depth}>${text}</h${depth}>`;
        const plain = stripMarkup(text);
        const id = slugger.slug(plain);
        headings.push({ id, text: plain });
        return `<h2 id="${id}">${text}</h2>`;
      },
    },
  });

  instance.use({
    async: true,
    async walkTokens(token: Token) {
      if (token.type !== 'code') return;
      const code = token as Tokens.Code;
      const lang = (code.lang ?? '').toLowerCase().trim();
      const highlighted = await highlight(code.text, lang);
      const html = lang === 'mermaid' ? wrapDiagram(code.text, highlighted) : highlighted;
      Object.assign(token, { type: 'html', block: true, text: html, raw: html });
    },
  });

  const html = wrapTables(await instance.parse(md));
  return { html, headings };
}

/**
 * Envuelve un diagrama para que el runner del cliente pueda dibujarlo. El
 * servidor no puede: mermaid mide texto contra el DOM y solo existe en el
 * navegador. Lo que se emite es el diagrama **ya resaltado** más su fuente en
 * un `data-`; si el JavaScript no llega o falla, queda un bloque de código
 * legible en vez de un hueco, y el indexador ve texto en ambos casos.
 *
 * @param source - Definición mermaid tal cual la escribió el autor.
 * @param highlighted - El mismo bloque pasado por Shiki, que hace de reserva.
 */
function wrapDiagram(source: string, highlighted: string): string {
  return `<figure class="mermaid-figure" data-mermaid="${encodeURIComponent(source)}">${highlighted}</figure>`;
}

/**
 * Texto plano de un encabezado: el índice muestra palabras, no etiquetas, y el
 * generador de anclas espera texto sin marcado.
 *
 * @param html - Encabezado tal y como lo devuelve el parser en línea.
 */
function stripMarkup(html: string): string {
  return html.replace(/<[^>]+>/g, '');
}
