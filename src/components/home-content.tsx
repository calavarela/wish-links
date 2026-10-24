"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { isOnPromo } from "@/lib/format";
import type { AppNotification, Category, DiscountCode, Item, ItemStatus, ShareLink } from "@/lib/types";
import AppHeader from "./app-header";
import FilterBar from "./filter-bar";
import ItemGrid from "./item-grid";

type SortKey = "recent" | "price_asc" | "price_desc" | "title";

function matchesSearch(item: Item, query: string): boolean {
  const haystack = [item.title, item.note, item.domain, item.site_name, ...item.tags]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

function sortItems(items: Item[], sort: SortKey): Item[] {
  const sorted = [...items];
  switch (sort) {
    case "price_asc":
      return sorted.sort((a, b) => (a.price_amount ?? Infinity) - (b.price_amount ?? Infinity));
    case "price_desc":
      return sorted.sort((a, b) => (b.price_amount ?? -Infinity) - (a.price_amount ?? -Infinity));
    case "title":
      return sorted.sort((a, b) => (a.title ?? "").localeCompare(b.title ?? "", "es"));
    default:
      return sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
}

/**
 * La lista principal. El servidor manda todos los productos una vez; los
 * filtros, el orden y la búsqueda se aplican acá leyendo la URL, que los
 * controles cambian con history.replaceState. Así filtrar es instantáneo y no
 * vuelve a pedir la página al servidor (la URL igual se puede compartir o recargar).
 */
export default function HomeContent({
  items,
  categories,
  shareLinks,
  storeDomains,
  discountCodes,
  notifications,
  userEmail,
}: {
  items: Item[];
  categories: Category[];
  shareLinks: ShareLink[];
  storeDomains: string[];
  discountCodes: DiscountCode[];
  notifications: AppNotification[];
  userEmail: string | null;
}) {
  const params = useSearchParams();
  const category = params.get("cat") ?? "all";
  const status = (params.get("status") ?? "pending") as ItemStatus | "all";
  const query = (params.get("q") ?? "").trim();
  const sort = (params.get("sort") ?? "recent") as SortKey;
  const promoOnly = params.get("promo") === "1";
  const tag = params.get("tag")?.toLowerCase() ?? null;
  const prefillUrl = params.get("add");
  const activeCategoryId = categories.some((c) => c.id === category) ? category : null;

  const visible = useMemo(
    () =>
      sortItems(
        items.filter((item) => {
          if (status !== "all" && item.status !== status) return false;
          if (category === "none" && item.category_id !== null) return false;
          if (category !== "all" && category !== "none" && item.category_id !== category) return false;
          if (query && !matchesSearch(item, query)) return false;
          if (promoOnly && !isOnPromo(item)) return false;
          if (tag && !item.tags.includes(tag)) return false;
          return true;
        }),
        sort,
      ),
    [items, status, category, query, promoOnly, tag, sort],
  );

  const total = visible.reduce((sum, item) => sum + (item.price_amount ?? 0), 0);
  const currencies = new Set(visible.filter((i) => i.price_amount !== null).map((i) => i.price_currency ?? "ARS"));

  return (
    <>
      {/* Header y filtros quedan fijos juntos: así no importa cuánto mida el header en cada pantalla. */}
      <div className="sticky top-0 z-30">
        <AppHeader
          categories={categories}
          prefillUrl={prefillUrl}
          shareLinks={shareLinks}
          activeCategoryId={activeCategoryId}
          notifications={notifications}
          userEmail={userEmail}
        />

        <FilterBar
          categories={categories}
          items={items}
          activeCategory={category}
          activeStatus={status}
          activeSort={sort}
          promoOnly={promoOnly}
          activeTag={tag}
        />
      </div>

      <main className="flex-1 px-4 pb-24 sm:px-6">
        <p className="mb-4 text-xs text-muted">
          {visible.length === 0 ? "Sin resultados" : `${visible.length} ${visible.length === 1 ? "link" : "links"}`}
          {total > 0 && currencies.size === 1 && (
            <>
              {" · "}
              <span className="font-medium text-ink">
                {new Intl.NumberFormat("es-AR", {
                  style: "currency",
                  currency: [...currencies][0],
                  maximumFractionDigits: 0,
                }).format(total)}
              </span>
            </>
          )}
        </p>

        <ItemGrid
          items={visible}
          categories={categories}
          storeDomains={storeDomains}
          discountCodes={discountCodes}
          hasAnyItem={items.length > 0}
        />
      </main>
    </>
  );
}
