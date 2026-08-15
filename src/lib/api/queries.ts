/**
 * Consultas de lectura que alimentan el sitio público, una por recurso del
 * backend, cada una con su política de caché y sus tags de purga. Los tipos se
 * extraen del OpenAPI generado (`schema.d.ts`); el backend no publica
 * `components.schemas`, así que cada alias sale de su ruta. Matices del
 * contrato que preservan estas funciones: los singletons del CMS devuelven
 * `null` con 200 cuando faltan; `skills` no tiene locale; blog/projects con
 * `page`/`limit` responden `{data, meta}` (paginación opt-in);
 * `eduContent`/`philContent`/`facts` de about llegan como strings con JSON
 * serializado.
 */
import 'server-only';
import type { paths } from './schema';
import { apiGet, type CachePolicy } from './client';

type Ok<P extends keyof paths> = paths[P] extends {
  get: { responses: { 200: { content: { 'application/json': infer T } } } };
}
  ? T
  : never;

export type SiteSettings = NonNullable<Ok<'/api/v1/cms/site-settings'>>;
export type HeroContent = NonNullable<Ok<'/api/v1/cms/hero'>>;
export type AboutContent = NonNullable<Ok<'/api/v1/cms/about'>>;
export type Skill = Ok<'/api/v1/cms/skills'>[number];
export type Experience = Ok<'/api/v1/cms/experiences'>[number];
export type Testimonial = Ok<'/api/v1/cms/testimonials'>[number];
export type Project = Ok<'/api/v1/projects/featured'>[number];
export type BlogListResponse = Ok<'/api/v1/blog'>;
export type BlogPost = Extract<BlogListResponse, unknown[]>[number];

export type Locale = 'es' | 'en';

/** Meta de paginación del backend cuando la respuesta llega paginada. */
export type PageMeta = Extract<BlogListResponse, { meta: unknown }>['meta'];

const CMS_CACHE: CachePolicy = { revalidate: 1800, tags: ['cms'] };
const PROJECTS_CACHE: CachePolicy = { revalidate: 600, tags: ['projects'] };
const BLOG_CACHE: CachePolicy = { revalidate: 600, tags: ['blog'] };

/**
 * Normaliza la paginación opt-in del backend: array plano cuando no se pidió
 * `page`/`limit`, `{data, meta}` cuando sí. Conserva `meta` para que las
 * páginas paginadas de blog/proyectos no lo pierdan.
 *
 * @param res - Respuesta del backend en cualquiera de las dos formas.
 * @returns Los items y, si la respuesta venía paginada, su meta.
 */
export function unwrapPage<T>(res: T[] | { data: T[]; meta: PageMeta }): {
  items: T[];
  meta?: PageMeta;
} {
  return Array.isArray(res) ? { items: res } : { items: res.data, meta: res.meta };
}

/** Singleton de ajustes del sitio para un locale; `null` si aún no existe. */
export const getSiteSettings = (locale: Locale) =>
  apiGet<SiteSettings | null>('/cms/site-settings', { locale }, CMS_CACHE);

/** Singleton del hero para un locale; `null` si aún no existe. */
export const getHero = (locale: Locale) =>
  apiGet<HeroContent | null>('/cms/hero', { locale }, CMS_CACHE);

/** Singleton del about para un locale; `null` si aún no existe. */
export const getAbout = (locale: Locale) =>
  apiGet<AboutContent | null>('/cms/about', { locale }, CMS_CACHE);

/** Todas las skills publicadas, ordenadas por categoría y orden (sin locale). */
export const getSkills = () => apiGet<Skill[]>('/cms/skills', undefined, CMS_CACHE);

/** Experiencias publicadas del locale, ordenadas por `order`. */
export const getExperiences = (locale: Locale) =>
  apiGet<Experience[]>('/cms/experiences', { locale }, CMS_CACHE);

/** Testimonios publicados del locale, ordenados por `order`. */
export const getTestimonials = (locale: Locale) =>
  apiGet<Testimonial[]>('/cms/testimonials', { locale }, CMS_CACHE);

/** Proyectos destacados del locale (array plano, sin `content`). */
export const getFeaturedProjects = (locale: Locale) =>
  apiGet<Project[]>('/projects/featured', { locale }, PROJECTS_CACHE);

/**
 * Listado completo de proyectos del locale. Sin `page`/`limit` el backend
 * devuelve array plano; `unwrapPage` cubre las dos formas.
 */
export async function getProjects(locale: Locale): Promise<Project[]> {
  const res = await apiGet<Project[] | { data: Project[]; meta: PageMeta }>(
    '/projects',
    { locale },
    PROJECTS_CACHE,
  );
  return unwrapPage(res).items;
}

/** Un proyecto por slug; es la única lectura que trae `content`. */
export const getProject = (slug: string, locale: Locale) =>
  apiGet<Project>(`/projects/${slug}`, { locale }, PROJECTS_CACHE);

/** Un post por slug; es la única lectura que trae `content`. */
export const getPost = (slug: string, locale: Locale) =>
  apiGet<BlogPost>(`/blog/${slug}`, { locale }, BLOG_CACHE);

/**
 * Listado completo de posts del locale, ordenado por fecha descendente por el
 * backend.
 */
export async function getPosts(locale: Locale): Promise<BlogPost[]> {
  const res = await apiGet<BlogListResponse>('/blog', { locale }, BLOG_CACHE);
  return unwrapPage(res).items;
}

/**
 * Parsea los campos de about que el CMS guarda como strings con JSON dentro.
 * Un payload corrupto no debe hacer desaparecer la sección en silencio: se
 * registra en el log del servidor antes de devolver vacío.
 *
 * @param raw - String con un array JSON serializado.
 * @returns El array parseado, o vacío si el JSON no es válido.
 */
export function parseAboutList(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn('parseAboutList: el CMS devolvió JSON válido pero no-array', raw.slice(0, 80));
      return [];
    }
    return parsed.filter((item): item is string => typeof item === 'string' && item.trim() !== '');
  } catch {
    console.warn('parseAboutList: JSON inválido en un campo de about', raw.slice(0, 80));
    return [];
  }
}
