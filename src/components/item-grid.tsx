import { Heart } from "lucide-react";
import { codesForDomain } from "@/lib/discount-codes";
import type { Category, DiscountCode, Item } from "@/lib/types";
import { isSameStore } from "@/lib/url";
import ItemCard from "./item-card";

export default function ItemGrid({
  items,
  categories,
  storeDomains,
  discountCodes,
  hasAnyItem,
}: {
  items: Item[];
  categories: Category[];
  storeDomains: string[];
  discountCodes: DiscountCode[];
  hasAnyItem: boolean;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line px-6 py-20 text-center">
        <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-brand-soft">
          <Heart className="size-5 text-brand" strokeWidth={2.2} />
        </div>
        {hasAnyItem ? (
          <>
            <p className="text-sm font-medium">No hay nada con estos filtros</p>
            <p className="mt-1 text-xs text-muted">Probá con otra categoría o estado.</p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium">Todavía no guardaste ningún link</p>
            <p className="mt-1 max-w-xs text-xs text-muted">
              Tocá <span className="font-medium text-ink">Agregar</span> y pegá el link de lo que te
              querés comprar. La tarjeta se arma sola.
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((item) => (
        <ItemCard
          key={item.id}
          item={item}
          categories={categories}
          storeSaved={storeDomains.some((domain) => isSameStore(item.domain, domain))}
          discountCode={codesForDomain(discountCodes, item.domain)[0] ?? null}
        />
      ))}
    </div>
  );
}
