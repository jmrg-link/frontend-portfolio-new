/**
 * Registro de servicio: el historial profesional como cronología horizontal
 * (`CareerTimeline`), única superficie de experiencia del sitio — sustituyó a
 * la bandeja de fichas cuando la cronología del About se movió aquí para no
 * duplicar contenido. La ficha activa concentra el detalle de tareas.
 *
 * `Experience.color` trae nombres semánticos que aquí no se usan: el color es
 * luz de estado, no decoración por entrada.
 */
import type { Experience } from '@/lib/api/queries';
import { CareerTimeline } from './career-timeline';
import { PanelSection } from './primitives';

export function ServiceLog({
  experiences,
  title,
  timelineLabel,
  controls,
}: {
  experiences: Experience[];
  title: string;
  timelineLabel: string;
  controls: { previous: string; next: string; goTo: string };
}) {
  if (experiences.length === 0) return null;

  return (
    <PanelSection id="experience" title={title} sideLabel="REGISTRO DE SERVICIO">
      <CareerTimeline experiences={experiences} label={timelineLabel} controls={controls} />
    </PanelSection>
  );
}
