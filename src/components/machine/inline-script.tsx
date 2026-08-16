'use client';

/**
 * Script en línea que solo debe ejecutar el analizador de HTML.
 *
 * En el servidor sale como `text/javascript` y el navegador lo ejecuta al leer el documento, antes
 * del primer pintado. En una navegación de cliente React reconstruye el árbol desde el payload y
 * un `<script>` insertado por DOM no se ejecutaría nunca, así que allí sale como `text/plain` y
 * queda inerte a propósito. `suppressHydrationWarning` cubre esa diferencia de tipo entre los dos
 * renderizados.
 *
 * Es componente de cliente a propósito: el tipo tiene que resolverse en cada entorno, y desde un
 * componente de servidor el ternario se evaluaría una sola vez —en el servidor— y el cliente
 * reconstruiría el mismo `text/javascript`.
 *
 * @param html - Cuerpo del script, estático y propio. No admite datos de terceros.
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === 'undefined' ? 'text/javascript' : 'text/plain'}
      suppressHydrationWarning
      // biome-ignore lint/security/noDangerouslySetInnerHtml: script estático y propio, sin entrada de usuario
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
