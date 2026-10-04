"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Heart, Plus, Search, Share2, User } from "lucide-react";
import type { AppNotification, Category, ShareLink } from "@/lib/types";
import AddItemDialog from "./add-item-dialog";
import NotificationsButton from "./notifications-button";
import ShareDialog from "./share-dialog";

export default function AppHeader({
  categories,
  prefillUrl,
  shareLinks,
  activeCategoryId,
  notifications,
  userEmail,
}: {
  categories: Category[];
  prefillUrl: string | null;
  shareLinks: ShareLink[];
  activeCategoryId: string | null;
  notifications: AppNotification[];
  userEmail: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [adding, setAdding] = useState(Boolean(prefillUrl));
  const [sharing, setSharing] = useState(false);
  const closeShare = useCallback(() => setSharing(false), []);
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
      // Sin este chequeo, cada navegación cambia searchParams y re-dispara este
      // efecto en un bucle de peticiones al servidor.
      if (params.toString() === searchParams.toString()) return;
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, pathname, router, searchParams]);

  // Estable entre renders: si cambiara de referencia en cada render, el
  // efecto de éxito en AddItemDialog (que depende de onClose) se
  // re-dispararía al reabrir el diálogo y lo cerraría de inmediato.
  const closeDialog = useCallback(() => {
    setAdding(false);
    if (prefillUrl) {
      // Saca el ?add= de la URL para que no se reabra al recargar.
      router.replace(pathname, { scroll: false });
    }
  }, [prefillUrl, pathname, router]);

  return (
    <>
      <header className="border-b border-line bg-canvas/85 px-4 py-3 backdrop-blur sm:px-6">
        {/* En el celu no entran el buscador y los botones en una fila: el buscador baja a la segunda. */}
        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:gap-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-brand-soft">
              <Heart className="size-4 text-brand" strokeWidth={2.4} />
            </div>
            <span className="text-sm font-semibold tracking-tight">Wish Links</span>
          </div>

          <div className="relative order-last w-full sm:order-none sm:w-auto sm:min-w-0 sm:flex-1">
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
            className="ml-auto flex items-center gap-1.5 rounded-xl bg-ink px-3 py-2 text-sm font-medium text-white transition hover:bg-stone-700 sm:ml-0"
          >
            <Plus className="size-4" />
            <span className="hidden sm:block">Agregar</span>
          </button>

          <NotificationsButton notifications={notifications} />

          <button
            type="button"
            onClick={() => setSharing(true)}
            aria-label="Compartir lista"
            title="Compartir lista"
            className="flex items-center rounded-xl border border-line p-2 text-muted transition hover:border-ink hover:text-ink"
          >
            <Share2 className="size-4" />
          </button>

          {/* Mismo tamaño que los otros botones (34px): la inicial del mail hace de avatar. */}
          <Link
            href="/perfil"
            aria-label="Mi perfil"
            title="Mi perfil"
            className="flex size-[34px] items-center justify-center rounded-full bg-ink text-sm font-semibold uppercase text-white transition hover:bg-stone-700"
          >
            {userEmail?.charAt(0) || <User className="size-4" />}
          </Link>
        </div>
      </header>

      <AddItemDialog
        open={adding}
        onClose={closeDialog}
        categories={categories}
        prefillUrl={prefillUrl}
      />

      {sharing && (
        <ShareDialog
          open
          onClose={closeShare}
          categories={categories}
          shareLinks={shareLinks}
          initialCategoryId={activeCategoryId}
        />
      )}
    </>
  );
}
