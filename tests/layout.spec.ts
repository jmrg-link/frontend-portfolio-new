import { expect, type Page, test } from '@playwright/test';

/**
 * Rutas canónicas de cada idioma. `/es/proyectos` y `/en/projects` son las buenas: el segmento
 * del otro idioma responde 307 y medir tras una redirección enmascara lo que se mide.
 */
const ROUTES = ['/es', '/es/blog', '/es/proyectos', '/en', '/en/blog', '/en/projects'];

/**
 * Anchos elegidos por lo que rompen, no por catálogo de dispositivos: 360 y 414 son móvil real;
 * 768 es donde Tailwind activa `md:`; 820, 880 y 900 acotan el tramo en el que la cabecera
 * desbordaba (768–895 medido el 2026-08-15); el resto son escritorio.
 */
const WIDTHS = [360, 414, 768, 820, 880, 900, 1024, 1280, 1440];

/** Mínimo de WCAG 2.2 AA, criterio 2.5.8 «Target Size (Minimum)», en píxeles CSS. */
const MIN_TARGET = 24;

/**
 * Espera a que la página deje de mover cosas por su cuenta. No usa `networkidle` —el widget de
 * Turnstile mantiene peticiones vivas— ni `page.screenshot()`, que nunca da esta página por
 * estable al haber animaciones infinitas (LED en standby, marquesina).
 */
async function settle(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
}

/** Desbordamiento horizontal del documento, en píxeles; 0 cuando la página se comporta. */
async function horizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const de = document.documentElement;
    return de.scrollWidth - de.clientWidth;
  });
}

/**
 * Elementos que empujan el ancho del documento: los que sobresalen **por la derecha** sin que
 * ningún ancestro los recorte. Sobresalir por la izquierda no genera scroll en LTR (ahí vive el
 * honeypot del formulario), y lo que cuelga dentro de un carril, de la marquesina VFD o de
 * cualquier contenedor con `overflow` distinto de `visible` tampoco: está recortado a propósito.
 */
async function bleedingElements(page: Page) {
  return page.evaluate(() => {
    const W = window.innerWidth;
    const visible = (el: Element) => {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) > 0.05 && r.width > 1 && r.height > 1;
    };
    const clippedByAncestor = (el: Element) => {
      let node: Element | null = el.parentElement;
      while (node && node !== document.documentElement) {
        const s = getComputedStyle(node);
        if (s.overflowX !== 'visible' || s.overflowY !== 'visible') return true;
        node = node.parentElement;
      }
      return false;
    };
    const describe = (el: Element) => {
      const parts: string[] = [];
      let node: Element | null = el;
      while (node && parts.length < 3) {
        const cls = String(node.className ?? '').trim().split(/\s+/).slice(0, 2).join('.');
        parts.unshift(node.tagName.toLowerCase() + (node.id ? `#${node.id}` : '') + (cls ? `.${cls}` : ''));
        node = node.parentElement;
      }
      return parts.join('>');
    };
    return [...document.querySelectorAll('body *')]
      .filter((el) => visible(el) && !clippedByAncestor(el))
      .filter((el) => el.getBoundingClientRect().right > W + 1)
      .map((el) => `${describe(el)} [${Math.round(el.getBoundingClientRect().left)}→${Math.round(el.getBoundingClientRect().right)}]`)
      .slice(0, 8);
  });
}

/**
 * Destinos interactivos por debajo del mínimo. Aplica dos excepciones legítimas antes de acusar:
 * la «inline» de WCAG 2.5.8 —un enlace embebido en prosa lo dimensiona el texto— y el patrón de
 * *stretched link*, donde un `::after` absoluto estira el área de clic hasta la tarjeta entera;
 * ahí el destino real es la tarjeta y no el renglón del título.
 */
async function undersizedTargets(page: Page, min: number) {
  return page.evaluate((minimum) => {
    const visible = (el: Element) => {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) > 0.05 && r.width > 1 && r.height > 1;
    };
    const inlineInProse = (el: Element) => Boolean(el.closest('p')) || Boolean(el.closest('.prose'));
    const stretchedArea = (el: Element) => {
      const after = getComputedStyle(el, '::after');
      if (after.content === 'none' || after.position !== 'absolute') return null;
      let node = el.parentElement;
      while (node && node !== document.body) {
        if (getComputedStyle(node).position !== 'static') return node.getBoundingClientRect();
        node = node.parentElement;
      }
      return null;
    };
    return [...document.querySelectorAll('a,button,[role=button],input,select,textarea,summary')]
      .filter(visible)
      .filter((el) => !String(el.className ?? '').includes('sr-only'))
      .filter((el) => !inlineInProse(el))
      .map((el) => {
        const r = stretchedArea(el) ?? el.getBoundingClientRect();
        const label = (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30);
        return { label, w: Math.round(r.width), h: Math.round(r.height) };
      })
      .filter((t) => t.w < minimum || t.h < minimum)
      .map((t) => `«${t.label}» ${t.w}×${t.h}`);
  }, min);
}

/**
 * Primer enlace de detalle de un listado. Los slugs vienen del CMS y cambian con cada
 * sincronización de la base, así que fijarlos en el test lo volvería frágil por diseño.
 */
async function firstDetailHref(page: Page, listRoute: string, prefix: string) {
  await page.goto(listRoute);
  await page.waitForLoadState('domcontentloaded');
  const href = await page.evaluate(
    (linkPrefix) => document.querySelector<HTMLAnchorElement>(`a[href^="${linkPrefix}"]`)?.getAttribute('href') ?? null,
    prefix,
  );
  expect(href, `ningún enlace de detalle en ${listRoute}`).not.toBeNull();
  return href as string;
}

test.describe('maquetación de las rutas de detalle', () => {
  for (const width of WIDTHS) {
    test(`sin scroll horizontal en el detalle de blog y proyecto a ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });

      for (const list of ['/es/blog', '/es/proyectos', '/en/blog', '/en/projects']) {
        const href = await firstDetailHref(page, list, `${list}/`);
        await page.goto(href);
        await settle(page);

        const bleeding = await bleedingElements(page);
        const overflow = await horizontalOverflow(page);

        expect(overflow, `${href} desborda ${overflow}px; culpables: ${bleeding.join(' | ') || 'ninguno identificado'}`).toBe(0);
      }
    });
  }
});

for (const route of ROUTES) {
  test.describe(`maquetación de ${route}`, () => {
    for (const width of WIDTHS) {
      test(`sin scroll horizontal a ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(route);
        await settle(page);

        const bleeding = await bleedingElements(page);
        const overflow = await horizontalOverflow(page);

        expect(overflow, `desborda ${overflow}px; culpables: ${bleeding.join(' | ') || 'ninguno identificado'}`).toBe(0);
        expect(bleeding, 'elementos fuera del viewport').toEqual([]);
      });
    }

    test('destinos táctiles de al menos 24×24 (WCAG 2.2 AA 2.5.8)', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(route);
      await settle(page);

      const undersized = await undersizedTargets(page, MIN_TARGET);

      expect(undersized, 'destinos por debajo del mínimo').toEqual([]);
    });
  });
}
