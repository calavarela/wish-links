"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Heart, LogOut, Plus, Search } from "lucide-react";
import { signOut } from "@/app/actions";
import type { Category } from "@/lib/types";
import AddItemDialog from "./add-item-dialog";

export default function AppHeader({
  categories,
  prefillUrl,
}: {
  categories: Category[];
  prefillUrl: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [adding, setAdding] = useState(Boolean(prefillUrl));
  const isFirstRender = useRef(true);

  // Escribe la búsqueda en la URL con un respiro, para no navegar en cada tecla.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (query.trim()) params.set("q", query.trim());
      else params.delete("q");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, pathname, router, searchParams]);

  function closeDialog() {
    setAdding(false);
    if (prefillUrl) {
      // Saca el ?add= de la URL para que no se reabra al recargar.
      router.replace(pathname, { scroll: false });
    }
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-brand-soft">
              <Heart className="size-4 text-brand" strokeWidth={2.4} />
            </div>
            <span className="hidden text-sm font-semibold tracking-tight sm:block">Wish Links</span>
          </div>

          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por título, nota o tienda"
              className="w-full rounded-xl border border-line bg-surface py-2 pl-9 pr-3 text-sm outline-none placeholder:text-subtle focus:border-ink"
            />
          </div>

          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 rounded-xl bg-ink px-3 py-2 text-sm font-medium text-white transition hover:bg-stone-700"
          >
            <Plus className="size-4" />
            <span className="hidden sm:block">Agregar</span>
          </button>

          <form action={signOut}>
            <button
              type="submit"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              className="flex items-center rounded-xl border border-line p-2 text-muted transition hover:border-ink hover:text-ink"
            >
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </header>

      <AddItemDialog
        open={adding}
        onClose={closeDialog}
        categories={categories}
        prefillUrl={prefillUrl}
      />
    </>
  );
}
