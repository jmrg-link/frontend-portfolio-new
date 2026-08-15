/**
 * Tira de tickets: los testimonios como papel térmico que la máquina ha ido
 * emitiendo, recorrible en horizontal. El ticket es un objeto físico —papel
 * claro, borde troquelado, tipografía de impresora— y por eso no cambia con el
 * tema. El sello de iniciales es el cuño de la máquina sobre el papel.
 *
 * El texto va verbatim tal y como lo devuelve la API: un testimonio no se
 * parafrasea.
 */
import type { Testimonial } from '@/lib/api/queries';
import { PanelSection } from './primitives';
import { Rail } from './rail';

export function Receipts({
  testimonials,
  title,
  railLabel,
  controls,
}: {
  testimonials: Testimonial[];
  title: string;
  railLabel: string;
  controls: { previous: string; next: string; goTo: string };
}) {
  if (testimonials.length === 0) return null;

  return (
    <PanelSection id="testimonials" title={title} sideLabel="TICKETS EMITIDOS">
      <Rail
        label={railLabel}
        count={testimonials.length}
        controls={controls}
        className="gap-6 pt-2 pb-4"
      >
        {testimonials.map((item) => (
          <figure
            key={item._id ?? item.author}
            className="w-[85vw] border-t-4 border-dashed border-panel/20 bg-ticket px-7 py-8 text-ticket-ink shadow-[var(--shadow-drop)] sm:w-[24rem]"
          >
            <div className="flex size-9 items-center justify-center rounded-full border border-ticket-ink/25 font-spec text-xs font-bold tracking-wider">
              {item.initials}
            </div>
            <blockquote className="mt-5 font-spec text-sm leading-relaxed">{item.text}</blockquote>
            <figcaption className="mt-6 border-t border-dashed border-ticket-ink/25 pt-4">
              <span className="block text-sm font-bold tracking-wide uppercase">{item.author}</span>
              <span className="mt-0.5 block font-spec text-[11px] tracking-wider text-ticket-ink/70">
                {item.position} · {item.date}
              </span>
            </figcaption>
          </figure>
        ))}
      </Rail>
    </PanelSection>
  );
}
