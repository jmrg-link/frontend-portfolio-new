/**
 * Ficha de una entrada en el registro: portada, etiquetas, titular, entradilla y
 * fecha. Vive fuera de la página porque la usan dos caminos —el render del
 * servidor y la acción que trae las tandas siguientes al hacer scroll— y una
 * ficha duplicada acabaría divergiendo.
 */
import { Link } from '@/i18n/navigation';
import type { BlogPost, Locale } from '@/lib/api/queries';
import { CmsImage } from './cms-image';

/**
 * Formatea la fecha del post en el locale activo.
 */
function formatDate(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(iso));
}

/**
 * Ficha de artículo: portada, etiquetas, titular y entradilla. Toda la ficha es
 * el enlace, para que la diana sea grande también en táctil.
 *
 * @param priority - Marca esta portada como elemento LCP: se precarga con prioridad alta y sin
 * `lazy`. Corresponde solo a la primera ficha del listado, que es la que abre el viewport;
 * aplicarlo a varias hace que compitan por el ancho de banda y retrasa la que importa.
 */
export function PostCard({
  post,
  locale,
  priority = false,
}: {
  post: BlogPost;
  locale: Locale;
  priority?: boolean;
}) {
  return (
    <li>
      <Link
        href={{ pathname: '/blog/[slug]', params: { slug: post.slug } }}
        className="group flex h-full flex-col overflow-hidden rounded-sm border border-groove bg-panel-raised transition-colors hover:border-led/60"
      >
        <CmsImage
          src={post.image}
          alt=""
          width={640}
          height={360}
          sizes="(min-width: 1024px) 22rem, (min-width: 640px) 45vw, 90vw"
          priority={priority}
          className="aspect-video w-full border-b border-groove object-cover"
        />
        <div className="flex flex-1 flex-col p-6">
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {post.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="font-spec text-[11px] tracking-wider text-selection">
                {tag}
              </span>
            ))}
          </div>
          <h2 className="mt-3 text-lg font-semibold text-silk group-hover:text-led-ink">
            {post.title}
          </h2>
          <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-silk-dim">
            {post.description}
          </p>
          <time dateTime={post.date} className="plate-label mt-5 block">
            {formatDate(post.date, locale)}
          </time>
        </div>
      </Link>
    </li>
  );
}
