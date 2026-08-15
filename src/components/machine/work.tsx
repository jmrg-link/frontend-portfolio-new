/**
 * Bandeja de productos: cada proyecto es un **producto en su bandeja** — una
 * placa fresada con cabecera de slot (coordenada + lámpara de estado, la
 * misma anatomía que la ficha de la cronología) y la captura **detrás de
 * vidrio**: marco hundido con reflejo diagonal, atenuada hasta que el hover
 * la ilumina, con la inclinación física de `DepthFrame`. El riel va en modo
 * `channel` (canal LED + lectura `03/06`), adaptación de «showcase-8» de
 * React Bits Pro.
 *
 * La bandeja entera lleva al detalle del proyecto: el enlace vive en el titular
 * —que es lo que anuncia el lector de pantalla— y su área de pulsación se
 * extiende a la placa con un pseudo-elemento. No se envuelve la tarjeta en un
 * `<a>` porque dentro hay otros enlaces, GitHub y Demo, y un enlace dentro de
 * otro es HTML inválido: esos chips se elevan por encima del área extendida.
 */
import type { Project } from '@/lib/api/queries';
import { Link } from '@/i18n/navigation';
import { DepthFrame } from './depth-frame';
import { Led, PanelSection, SelectionCode } from './primitives';
import { Rail } from './rail';
import { CmsImage } from './cms-image';

const STATUS_LED: Record<string, boolean> = {
  completed: true,
  'in-progress': false,
};

export function ProductTrays({
  projects,
  title,
  statusLabels,
  railLabel,
  controls,
  allLabel,
}: {
  projects: Project[];
  title: string;
  statusLabels: Record<string, string>;
  railLabel: string;
  controls: { previous: string; next: string; goTo: string };
  allLabel: string;
}) {
  if (projects.length === 0) return null;

  return (
    <PanelSection id="work" title={title} tone="deep" sideLabel="BANDEJA DE PRODUCTOS">
      <Rail
        label={railLabel}
        count={projects.length}
        controls={controls}
        readout="channel"
        className="gap-6"
      >
        {projects.map((project, index) => (
          <article
            key={project._id ?? project.slug}
            className="group relative flex w-[85vw] flex-col rounded-sm border border-groove bg-panel-raised p-5 shadow-[var(--shadow-drop)] transition-colors hover:border-led/60 sm:w-[26rem] sm:p-6"
          >
            <div className="flex items-center justify-between">
              <SelectionCode code={`P${index + 1}`} />
              <Led
                on={STATUS_LED[project.status] ?? true}
                label={statusLabels[project.status] ?? project.status}
              />
            </div>
            <DepthFrame className="mt-4">
              <div className="relative overflow-hidden rounded-sm border border-groove bg-vfd-glass shadow-[inset_0_2px_10px_rgba(0,0,0,0.6)]">
                <CmsImage
                  src={project.image}
                  alt={project.title}
                  width={832}
                  height={468}
                  sizes="(min-width: 640px) 26rem, 85vw"
                  loading={index === 0 ? 'eager' : 'lazy'}
                  className="aspect-video w-full object-contain p-3 opacity-85 saturate-[0.85] transition-[opacity,filter,transform] duration-500 ease-out group-hover:scale-[1.02] group-hover:opacity-100 group-hover:saturate-100"
                  fallback={<div aria-hidden className="aspect-video w-full" />}
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.09),transparent_38%)]"
                />
              </div>
            </DepthFrame>
            <h3 className="mt-5 text-xl font-semibold tracking-tight text-silk">
              <Link
                href={{ pathname: '/projects/[slug]', params: { slug: project.slug } }}
                className="transition-colors after:absolute after:inset-0 after:rounded-sm group-hover:text-led-ink"
              >
                {project.title}
              </Link>
            </h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-silk-dim">
              {project.description}
            </p>
            <p className="mt-4 border-t border-groove pt-4 font-spec text-xs leading-relaxed tracking-wider text-selection">
              {project.tech.join(' · ')}
            </p>
            <div className="relative z-10 mt-4 flex gap-3">
              {project.github ? (
                <a
                  href={project.github}
                  rel="noreferrer noopener"
                  target="_blank"
                  className="plate-label rounded-xs border border-groove px-3 py-1.5 transition-colors hover:border-led hover:text-led-ink active:translate-y-px"
                >
                  GitHub
                </a>
              ) : null}
              {project.demo ? (
                <a
                  href={project.demo}
                  rel="noreferrer noopener"
                  target="_blank"
                  className="plate-label rounded-xs border border-groove px-3 py-1.5 transition-colors hover:border-led hover:text-led-ink active:translate-y-px"
                >
                  Demo
                </a>
              ) : null}
            </div>
          </article>
        ))}
      </Rail>

      <div className="mt-8">
        <Link
          href="/projects"
          className="plate-label inline-flex min-h-6 items-center hover:text-led-ink"
        >
          {allLabel} →
        </Link>
      </div>
    </PanelSection>
  );
}
