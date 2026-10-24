/**
 * Esqueletos para los loading.tsx. Con ellos Next puede mostrar la pantalla al
 * instante al navegar (y prefetchear la parte estática de las rutas
 * dinámicas) mientras los datos llegan. Imitan el layout real para que no salte.
 */

function Bar({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`animate-pulse rounded-lg bg-stone-200/70 ${className}`} style={style} />;
}

export function CardGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="aspect-4/3 animate-pulse bg-stone-100" />
          <div className="flex flex-col gap-2 p-3">
            <Bar className="h-2.5 w-1/2" />
            <Bar className="h-3.5 w-11/12" />
            <Bar className="h-3.5 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Volver + título + bajada, como en las páginas de tiendas, listas, perfil y gastos. */
export function PageHeadSkeleton() {
  return (
    <div aria-hidden>
      <Bar className="h-3 w-24" />
      <Bar className="mt-6 h-6 w-48" />
      <Bar className="mt-2 h-3.5 w-64 max-w-full" />
    </div>
  );
}

export function RowsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="mt-6 flex flex-col gap-3" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3">
          <Bar className="size-10 shrink-0 rounded-xl" />
          <div className="flex flex-1 flex-col gap-2">
            <Bar className="h-3.5 w-1/2" />
            <Bar className="h-2.5 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className={`mt-5 grid gap-2 ${count === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-2xl border border-line bg-surface p-3">
          <Bar className="h-2.5 w-14" />
          <Bar className="mt-2 h-5 w-10" />
        </div>
      ))}
    </div>
  );
}

/** La lista principal: header, chips de categorías y la grilla. */
export function HomeSkeleton() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col" aria-busy>
      <div className="border-b border-line px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <Bar className="size-8 rounded-xl" />
          <Bar className="h-4 w-24" />
          <div className="ml-auto flex gap-2">
            <Bar className="size-[34px] rounded-xl" />
            <Bar className="size-[34px] rounded-xl" />
            <Bar className="size-[34px] rounded-full" />
          </div>
        </div>
        <Bar className="mt-2 h-9 w-full rounded-xl sm:hidden" />
      </div>
      <div className="flex gap-2 px-4 py-3 sm:px-6">
        {[16, 20, 18, 16].map((w, i) => (
          <Bar key={i} className="h-7 shrink-0 rounded-full" style={{ width: `${w * 4}px` }} />
        ))}
      </div>
      <main className="px-4 sm:px-6">
        <Bar className="mb-4 h-3 w-28" />
        <CardGridSkeleton />
      </main>
    </div>
  );
}
