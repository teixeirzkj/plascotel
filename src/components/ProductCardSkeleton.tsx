/** Placeholder do formato de um ProductCard, exibido enquanto o catálogo carrega. */
export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-card">
      <div className="aspect-[4/5] animate-pulse bg-wood-100" />
      <div className="flex flex-col gap-2 p-4">
        <div className="h-3 w-1/3 animate-pulse rounded bg-wood-100" />
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
    <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-3">
      {Array.from({ length: quantidade }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
