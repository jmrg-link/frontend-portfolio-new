/**
 * Icono serigrafiado de una habilidad: SVG monocromo emitido por el servidor,
 * sin una sola línea de JavaScript en el cliente. Los nodos vienen de
 * `skill-icon-nodes.ts`, generado desde lucide-static, porque importar
 * `lucide-react` abriría una frontera de cliente —su componente `Icon` declara
 * `'use client'`— y mandaría toda su capa de runtime al navegador para dibujar
 * unas líneas ya conocidas en build.
 *
 * Un solo grosor de trazo y `currentColor` para todo el set: en este mundo los
 * iconos son serigrafía sobre la placa, no logotipos de marca a color.
 */
import { createElement } from 'react';
import { SKILL_ICON_NODES } from '@/lib/icons/skill-icon-nodes';

export function SkillIcon({ name }: { name: string }) {
  const node = SKILL_ICON_NODES[name];
  if (!node) return null;

  return (
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {node.map(([tag, attrs], index) => createElement(tag, { ...attrs, key: index }))}
    </svg>
  );
}
