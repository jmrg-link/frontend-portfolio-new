/**
 * Catch-all de rutas desconocidas dentro de un locale válido: delega en el 404
 * del segmento para que las URLs inexistentes vean el panel «sin señal» en vez
 * del 404 por defecto de Next.
 */
import { notFound } from 'next/navigation';

export default function CatchAll(): never {
  notFound();
}
