import { writeFileSync } from 'node:fs';

const NAMES = 'ArrowRightLeft Box Boxes Cloud CloudCog Code2 Component Container Database FileCode2 Flame Gauge GitBranch GitGraph Hexagon KeyRound Layers Network Package Palette Radio RefreshCw Server Smartphone Store Terminal Workflow Zap'.split(' ');
const ALIAS = { Code2: 'code-xml', FileCode2: 'file-code-corner' };
const kebab = (n) => ALIAS[n] ?? n.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([A-Z])([A-Z][a-z])/g, '$1-$2').toLowerCase();

const parseAttrs = (s) => {
  const out = {};
  for (const m of s.matchAll(/([\w:-]+)="([^"]*)"/g)) {
    const [, k, v] = m;
    out[k] = /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v;
  }
  return out;
};

const nodes = {};
const missing = [];
for (const name of NAMES) {
  const url = `https://unpkg.com/lucide-static@latest/icons/${kebab(name)}.svg`;
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) { missing.push(name); continue; }
  const svg = await res.text();
  const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>[\s\S]*$/, '');
  const els = [...inner.matchAll(/<(\w+)([^>]*?)\/?>/g)]
    .filter(([, tag]) => tag !== 'svg')
    .map(([, tag, attrs]) => [tag, parseAttrs(attrs)]);
  if (els.length === 0) { missing.push(name); continue; }
  nodes[name] = els;
}

const body = Object.entries(nodes)
  .map(([name, els]) => `  ${name}: [\n${els.map(([t, a]) => `    ['${t}', ${JSON.stringify(a)}],`).join('\n')}\n  ],`)
  .join('\n');

writeFileSync('skill-icon-nodes.ts', `/**
 * Nodos SVG de los iconos que el CMS referencia en \`Skill.icon\`. Generados a
 * partir de lucide-static y commiteados a propósito: importar \`lucide-react\`
 * arrastraría toda su capa de cliente al navegador —su \`Icon\` lleva
 * \`'use client'\`— para dibujar unas líneas que el servidor puede emitir ya
 * resueltas. No editar a mano.
 */
export type IconNode = readonly (readonly [string, Record<string, string | number>])[];

export const SKILL_ICON_NODES: Record<string, IconNode> = {
${body}
};
`);
console.log(`generados: ${Object.keys(nodes).length} · faltan: ${missing.join(', ') || 'ninguno'}`);
