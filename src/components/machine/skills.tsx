/**
 * Matriz de selección de la máquina: una botonera de categorías y, debajo, la
 * bandeja de esa categoría recorrible en horizontal, con el código de selección
 * (B3, F1…) y el icono serigrafiado de cada habilidad. La botonera mantiene
 * visible qué se está mirando, que es lo que compensa que el scroll horizontal
 * esconda parte del contenido.
 *
 * Los paneles se construyen aquí, en el servidor, y viajan ya renderizados al
 * componente de cliente que gestiona la selección: así los 41 iconos no cuestan
 * un byte de JavaScript en el navegador.
 *
 * Las 41 skills llegan del CMS sin locale y sin nivel de dominio: el backend no
 * lo tiene, así que aquí no se inventa.
 */
import type { Skill } from '@/lib/api/queries';
import { PanelSection, SelectionCode } from './primitives';
import { SkillIcon } from './skill-icon';
import { Rail } from './rail';
import { SkillTrays, type Tray } from './skill-trays';

const CATEGORY_PREFIX: Record<string, string> = {
  backend: 'B',
  frontend: 'F',
  database: 'D',
  devops: 'V',
  sysadmin: 'S',
  architecture: 'A',
};

const CATEGORY_ORDER = ['backend', 'frontend', 'database', 'devops', 'sysadmin', 'architecture'];

/**
 * Agrupa las skills por categoría respetando el orden del panel y el `order`
 * que ya trae cada skill del backend.
 *
 * @param skills - Colección completa servida por el CMS.
 * @returns Pares categoría/skills, sin las categorías vacías.
 */
function groupByCategory(skills: Skill[]): Array<[string, Skill[]]> {
  return CATEGORY_ORDER.flatMap((category) => {
    const items = skills.filter((skill) => skill.category === category);
    return items.length > 0 ? [[category, items] as [string, Skill[]]] : [];
  });
}

export function SkillsMatrix({
  skills,
  title,
  railLabel,
  controls,
}: {
  skills: Skill[];
  title: string;
  railLabel: (category: string) => string;
  controls: { previous: string; next: string; goTo: string };
}) {
  if (skills.length === 0) return null;

  const trays: Tray[] = groupByCategory(skills).map(([category, items]) => ({
    key: category,
    label: category,
    panel: (
      <Rail
        label={railLabel(category)}
        count={items.length}
        controls={controls}
        className="gap-px rounded-sm border border-groove bg-groove"
      >
        {items.map((skill, index) => (
          <div
            key={skill._id ?? skill.name}
            className="flex min-w-44 items-center gap-3 bg-panel px-4 py-3.5 transition-colors hover:bg-panel-raised"
          >
            <SelectionCode code={`${CATEGORY_PREFIX[category] ?? 'X'}${index + 1}`} />
            <span className="text-silk-dim">
              <SkillIcon name={skill.icon} />
            </span>
            <span className="text-sm font-medium whitespace-nowrap text-silk">{skill.name}</span>
          </div>
        ))}
      </Rail>
    ),
  }));

  return (
    <PanelSection id="skills" title={title} tone="deep" sideLabel="MATRIZ DE SELECCIÓN">
      <SkillTrays trays={trays} />
    </PanelSection>
  );
}
