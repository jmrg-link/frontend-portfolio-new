/**
 * Últimas entradas del blog como registro del display: fecha en matriz de
 * puntos esmeralda y título serigrafiado. Sin enlaces todavía: la superficie
 * blog/[slug] es el siguiente paso del roadmap y un ancla rota sería peor que
 * ninguna.
 */
import type { BlogPost, Locale } from '@/lib/api/queries';
import { Link } from '@/i18n/navigation';
import { PanelSection, VfdGlass } from './primitives';
import { DecryptedText } from './decrypted-text';
import { EndlessLog } from './endless-log';

/**
 * Formatea la fecha ISO del post en el locale activo, estilo placa (corta).
 */
function formatDate(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(new Date(iso));
}

export function BlogFeed({
  posts,
  locale,
  title,
  allLabel,
  positionLabel,
}: {
  posts: BlogPost[];
  locale: Locale;
  title: string;
  allLabel: string;
  positionLabel: string;
}) {
  if (posts.length === 0) return null;

  return (
    <PanelSection id="blog" title={title} tone="deep" sideLabel="REGISTRO DEL DISPLAY">
      <VfdGlass>
        <EndlessLog positionLabel={positionLabel}>
          {posts.map((post, index) => (
            <li key={post._id ?? post.slug}>
              <Link
                href={{ pathname: '/blog/[slug]', params: { slug: post.slug } }}
                className="flex flex-col gap-1 py-4 transition-opacity hover:opacity-80 sm:flex-row sm:items-baseline sm:gap-6"
              >
                <time
                  dateTime={post.date}
                  className="shrink-0 text-xs tracking-wider text-vfd-dim sm:w-28"
                >
                  {formatDate(post.date, locale)}
                </time>
                <div>
                  <h3 className="text-base font-bold">
                    <DecryptedText
                      text={post.title}
                      durationMs={700}
                      playOnVisible
                      delayMs={(index % 4) * 160}
                    />
                  </h3>
                  <p className="mt-1 line-clamp-2 font-spec text-xs leading-relaxed text-vfd/85">
                    {post.description}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </EndlessLog>
      </VfdGlass>
      <div className="mt-6">
        <Link
          href="/blog"
          className="plate-label inline-flex min-h-6 items-center hover:text-led-ink"
        >
          {allLabel} →
        </Link>
      </div>
    </PanelSection>
  );
}
