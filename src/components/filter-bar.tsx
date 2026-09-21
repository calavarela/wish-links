"use client";

import { useActionState, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Settings2, Trash2 } from "lucide-react";
import { createCategory, deleteCategory, type ActionState } from "@/app/actions";
import type { Category, Item, ItemStatus } from "@/lib/types";
import Dialog from "./dialog";
import { fieldClass } from "./item-fields";

const EMPTY: ActionState = { error: null };

const STATUS_OPTIONS: { value: ItemStatus | "all"; label: string }[] = [
  { value: "pending", label: "Pendientes" },
  { value: "bought", label: "Comprados" },
  { value: "discarded", label: "Descartados" },
  { value: "all", label: "Todos" },
];

const SORT_OPTIONS = [
  { value: "recent", label: "Recientes" },
  { value: "price_asc", label: "Precio ↑" },
  { value: "price_desc", label: "Precio ↓" },
  { value: "title", label: "A-Z" },
];

export default function FilterBar({
  categories,
  items,
  activeCategory,
  activeStatus,
  activeSort,
}: {
  categories: Category[];
  items: Item[];
  activeCategory: string;
  activeStatus: ItemStatus | "all";
  activeSort: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [managing, setManaging] = useState(false);

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  // Los contadores respetan el estado elegido: "Ropa 4" son 4 pendientes.
  const inStatus = items.filter((item) => activeStatus === "all" || item.status === activeStatus);
  const countFor = (categoryId: string | null) =>
    inStatus.filter((item) => item.category_id === categoryId).length;
  const uncategorized = countFor(null);

  const chipClass = (active: boolean) =>
    `shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
      active
        ? "border-ink bg-ink text-white"
        : "border-line bg-surface text-muted hover:border-ink hover:text-ink"
    }`;

  return (
    <>
      <div className="sticky top-[57px] z-20 flex flex-col gap-2 bg-canvas/85 px-4 pb-3 pt-3 backdrop-blur sm:px-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            className={chipClass(activeCategory === "all")}
            onClick={() => setParam("cat", null)}
          >
            Todas {inStatus.length > 0 && <span className="opacity-60">{inStatus.length}</span>}
          </button>

          {categories.map((category) => {
            const count = countFor(category.id);
            return (
              <button
                key={category.id}
                type="button"
                className={chipClass(activeCategory === category.id)}
                onClick={() => setParam("cat", category.id)}
              >
                {category.emoji ? `${category.emoji} ` : ""}
                {category.name} {count > 0 && <span className="opacity-60">{count}</span>}
              </button>
            );
          })}

          {uncategorized > 0 && (
            <button
              type="button"
              className={chipClass(activeCategory === "none")}
              onClick={() => setParam("cat", "none")}
            >
              Sin categoría <span className="opacity-60">{uncategorized}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setManaging(true)}
            aria-label="Administrar categorías"
            className="shrink-0 rounded-full border border-line bg-surface p-1.5 text-muted transition hover:border-ink hover:text-ink"
          >
            <Settings2 className="size-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={activeStatus}
            onChange={(event) => setParam("status", event.target.value === "pending" ? null : event.target.value)}
            className="rounded-lg border border-line bg-surface px-2 py-1 text-xs text-muted outline-none focus:border-ink"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={activeSort}
            onChange={(event) => setParam("sort", event.target.value === "recent" ? null : event.target.value)}
            className="rounded-lg border border-line bg-surface px-2 py-1 text-xs text-muted outline-none focus:border-ink"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <CategoryManager
        open={managing}
        onClose={() => setManaging(false)}
        categories={categories}
        countFor={countFor}
      />
    </>
  );
}

function CategoryManager({
  open,
  onClose,
  categories,
  countFor,
}: {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  countFor: (id: string) => number;
}) {
  const [state, formAction, pending] = useActionState(createCategory, EMPTY);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (state.ok) setFormKey((key) => key + 1);
  }, [state]);

  return (
    <Dialog open={open} onClose={onClose} title="Categorías">
      <div className="flex flex-col gap-4 p-5">
        <ul className="flex flex-col gap-1">
          {categories.map((category) => (
            <li
              key={category.id}
              className="flex items-center justify-between rounded-xl border border-line px-3 py-2"
            >
              <span className="text-sm">
                {category.emoji ? `${category.emoji} ` : ""}
                {category.name}
                <span className="ml-2 text-xs text-subtle">{countFor(category.id)}</span>
              </span>
              <form action={deleteCategory.bind(null, category.id)}>
                <button
                  type="submit"
                  aria-label={`Borrar ${category.name}`}
                  className="rounded-lg p-1.5 text-subtle transition hover:bg-brand-soft hover:text-brand"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </form>
            </li>
          ))}
        </ul>

        <p className="text-[11px] leading-tight text-subtle">
          Al borrar una categoría, sus links quedan en “Sin categoría”. No se borra nada.
        </p>

        <form key={formKey} action={formAction} className="flex gap-2 border-t border-line pt-4">
          <input className={`${fieldClass} w-16 text-center`} name="emoji" placeholder="✨" maxLength={4} />
          <input className={fieldClass} name="name" placeholder="Nueva categoría" maxLength={40} required />
          <button
            type="submit"
            disabled={pending}
            className="flex items-center gap-1.5 rounded-xl bg-ink px-3 py-2 text-sm font-medium text-white transition hover:bg-stone-700 disabled:opacity-60"
          >
            {pending && <Loader2 className="size-3.5 animate-spin" />}
            Crear
          </button>
        </form>

        {state.error && <p className="text-xs text-brand">{state.error}</p>}
      </div>
    </Dialog>
  );
}
