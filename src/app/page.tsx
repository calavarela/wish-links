import { createClient } from "@/lib/supabase/server";
import type { Category, Item, ItemStatus } from "@/lib/types";
import AppHeader from "@/components/app-header";
import FilterBar from "@/components/filter-bar";
import ItemGrid from "@/components/item-grid";

type SortKey = "recent" | "price_asc" | "price_desc" | "title";

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

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

export default async function HomePage(props: PageProps<"/">) {
  const params = await props.searchParams;
  const category = first(params.cat) ?? "all";
  const status = (first(params.status) ?? "pending") as ItemStatus | "all";
  const query = (first(params.q) ?? "").trim();
  const sort = (first(params.sort) ?? "recent") as SortKey;
  const prefillUrl = first(params.add) ?? null;

  const supabase = await createClient();

  // El volumen de una wishlist personal es chico: se trae todo una vez y se
  // filtra en memoria, así los contadores de cada chip salen gratis.
  const [{ data: categories }, { data: allItems }] = await Promise.all([
    supabase.from("categories").select("*").order("position"),
    supabase.from("items").select("*").order("created_at", { ascending: false }),
  ]);

  const categoryList = (categories ?? []) as Category[];
  const items = (allItems ?? []) as Item[];

  const visible = sortItems(
    items.filter((item) => {
      if (status !== "all" && item.status !== status) return false;
      if (category === "none" && item.category_id !== null) return false;
      if (category !== "all" && category !== "none" && item.category_id !== category) return false;
      if (query && !matchesSearch(item, query)) return false;
      return true;
    }),
    sort,
  );

  const total = visible.reduce((sum, item) => sum + (item.price_amount ?? 0), 0);
  const currencies = new Set(visible.filter((i) => i.price_amount !== null).map((i) => i.price_currency ?? "ARS"));

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col">
      <AppHeader categories={categoryList} prefillUrl={prefillUrl} />

      <FilterBar
        categories={categoryList}
        items={items}
        activeCategory={category}
        activeStatus={status}
        activeSort={sort}
      />

      <main className="flex-1 px-4 pb-24 sm:px-6">
        <p className="mb-4 text-xs text-muted">
          {visible.length === 0
            ? "Sin resultados"
            : `${visible.length} ${visible.length === 1 ? "link" : "links"}`}
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

        <ItemGrid items={visible} categories={categoryList} hasAnyItem={items.length > 0} />
      </main>
    </div>
  );
}
