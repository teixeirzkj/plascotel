/** Placeholder do formato de um ProductCard, exibido enquanto o catálogo carrega. */
export function ProductCardSkeleton() {
  return (
    <div className="flex flex-row gap-3 overflow-hidden rounded-2xl bg-white p-2.5 shadow-card sm:flex-col sm:gap-0 sm:p-0">
      <div className="aspect-square w-24 flex-none animate-pulse rounded-xl bg-wood-100 sm:aspect-[4/5] sm:w-full sm:rounded-none" />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 py-0.5 sm:justify-start sm:p-4">
        <div className="hidden h-3 w-1/3 animate-pulse rounded bg-wood-100 sm:block" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-wood-100" />
        <div className="h-3 w-full animate-pulse rounded bg-wood-100" />
        <div className="mt-1 h-5 w-1/2 animate-pulse rounded bg-wood-100" />
      </div>
    </div>
  );
}

/** Grade de skeletons — mesmo layout de grid usado na listagem de produtos. */
export function ProductGridSkeleton({ quantidade = 6 }: { quantidade?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 md:grid-cols-3 lg:grid-cols-3">
      {Array.from({ length: quantidade }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
