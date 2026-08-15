/**
 * Placa de identidad: una declaración grande que se lee de un vistazo y la
 * placa de filosofía —la primera frase del CMS como cita en primera persona y
 * la formación como registro numerado, el patrón de fila con coordenada del
 * mundo—. Composición adaptada del bloque «about-12» de React Bits Pro a las
 * piezas y tokens del panel; la cronología profesional vive en «Registro de
 * servicio» (`career-timeline.tsx`).
 *
 * Los contenidos de about llegan del CMS como strings con JSON serializado.
 */
import type { AboutContent } from '@/lib/api/queries';
import { parseAboutList } from '@/lib/api/queries';
import { PanelSection } from './primitives';

/**
 * Recorta el texto principal a su primera frase para usarla como declaración
 * grande: el párrafo completo a cuerpo display era un muro y, a decisión del
 * usuario, el resto ni se muestra. El corte es solo de presentación (el
 * contenido del CMS no se toca) y busca el primer «. » seguido de mayúscula
 * para no tropezar con abreviaturas tipo «Node.js». Sin ese corte, vuelve el
 * texto entero.
 *
 * @param text - El `mainText` del CMS.
 * @returns La primera frase, o el texto completo si no hay corte.
 */
function firstSentence(text: string): string {
  const cut = text.match(/\.\s+(?=[A-ZÁÉÍÓÚÑ])/);
  if (!cut || cut.index === undefined) return text;
  return text.slice(0, cut.index + 1);
}

/**
 * Placa de filosofía, forma completa del bloque «about-12» de React Bits Pro
 * traducida al panel: a la izquierda la cita (primer párrafo de
 * `philContent`) sobre una placa **invertida** —el panel en negativo, silk
 * sobre oscuro de noche y a la inversa de día— con los párrafos de apoyo
 * debajo; a la derecha el expertise como registro numerado `01–06`, la fila
 * con coordenada del mundo. La formación (`eduContent`) se retiró a decisión
 * del usuario. Si un campo llega vacío, su mitad se retira sola.
 */
function PhilosophyPlate({ about }: { about: AboutContent }) {
  const [quote, ...support] = parseAboutList(about.philContent);
  const facts = parseAboutList(about.facts);

  if (!quote && facts.length === 0) return null;

  return (
    <div className="mt-16 grid gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
      {quote ? (
        <div>
          <h3 className="plate-label">{about.philTitle}</h3>
          <figure className="mt-6 rounded-sm bg-silk p-8 shadow-[var(--shadow-drop)] md:p-10">
            <blockquote className="text-2xl leading-snug font-semibold tracking-tight text-panel-deep [text-wrap:balance] md:text-3xl">
              «{quote}»
            </blockquote>
          </figure>
          {support.map((paragraph) => (
            <p
              key={paragraph.slice(0, 40)}
              className="mt-6 max-w-xl text-sm leading-relaxed text-silk-dim"
            >
              {paragraph}
            </p>
          ))}
        </div>
      ) : null}

      {facts.length > 0 ? (
        <div>
          <h3 className="plate-label">{about.factsTitle}</h3>
          <ol className="mt-6 border-y border-groove">
            {facts.map((fact, index) => (
              <li
                key={fact}
                className="grid grid-cols-[3rem_1fr] items-baseline gap-3 border-b border-groove py-4 transition-colors last:border-b-0 hover:bg-panel-raised"
              >
                <span className="font-spec text-sm text-selection">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="text-sm leading-relaxed text-silk">{fact}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}

export function AboutSpecs({ about }: { about: AboutContent | null }) {
  if (!about) return null;

  return (
    <PanelSection id="about" title={about.title} sideLabel={about.badge}>
      <p className="mb-14 max-w-4xl text-2xl leading-snug font-medium text-silk [text-wrap:balance] md:text-3xl">
        {firstSentence(about.mainText)}
      </p>
      <PhilosophyPlate about={about} />
    </PanelSection>
  );
}
