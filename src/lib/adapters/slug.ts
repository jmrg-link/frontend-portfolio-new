import 'server-only';

/**
 * Adaptador de generación de anclas. El resto del código pide un ancla para un
 * texto y no sabe con qué se fabrica: si mañana cambia la librería, cambia este
 * archivo y nada más.
 *
 * Detrás va `github-slugger`, que es el mismo algoritmo que aplica GitHub a los
 * encabezados de un README y el que usa `rehype-slug` en el ecosistema
 * markdown. Resuelve dos cosas que una expresión regular casera hace mal:
 * transliterar más allá de los acentos latinos —emoji, griego, cirílico— y,
 * sobre todo, **desduplicar**: dos apartados titulados igual en el mismo
 * artículo reciben `titulo` y `titulo-1` en vez de compartir ancla y hacer que
 * el índice salte siempre al primero.
 *
 * Por eso el adaptador expone una **fábrica** y no una función suelta: el
 * contador de repeticiones vive en la instancia y hay que crear una por
 * documento, o los anclas de un artículo contaminarían los del siguiente.
 */
import GithubSlugger from 'github-slugger';

/** Genera anclas únicas dentro de un mismo documento. */
export type Slugger = {
  /**
   * Ancla para un encabezado.
   *
   * @param text - Texto plano del encabezado, ya sin marcado.
   */
  slug(text: string): string;
};

/**
 * Crea un generador de anclas para un documento.
 *
 * @returns Un generador con memoria de lo ya emitido en ese documento.
 */
export function createSlugger(): Slugger {
  const slugger = new GithubSlugger();
  return {
    slug: (text: string) => slugger.slug(text),
  };
}
