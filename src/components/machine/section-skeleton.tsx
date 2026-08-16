/**
 * Hueco reservado mientras una sección llega o se hidrata.
 *
 * Solo reserva altura: sin pulso ni barrido, que serían movimiento sin
 * información. Su altura mínima aproxima la de una sección real para que la
 * sustitución no desplace lo que hay debajo.
 */
export function SectionSkeleton() {
  return <div aria-hidden className="min-h-[60vh] w-full bg-panel" />;
}
