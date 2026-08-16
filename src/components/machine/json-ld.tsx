/**
 * Datos estructurados schema.org embebidos en la página.
 *
 * Recibe el grafo ya construido y lo serializa en un `application/ld+json`. No
 * es un script ejecutable: los buscadores leen su contenido, el navegador no lo
 * evalúa.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: serialización JSON propia, sin entrada de usuario
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
