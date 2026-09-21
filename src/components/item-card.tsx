"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Check, MoreHorizontal, Pencil, RotateCcw, Trash2, X } from "lucide-react";
import { deleteItem, setItemStatus } from "@/app/actions";
import { formatPrice } from "@/lib/format";
import type { Category, Item } from "@/lib/types";
import EditItemDialog from "./edit-item-dialog";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

export default function ItemCard({ item, categories }: { item: Item; categories: Category[] }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpen]);

  const price = formatPrice(item.price_amount, item.price_currency);
  const isStored = Boolean(item.image_url && SUPABASE_URL && item.image_url.startsWith(SUPABASE_URL));
  const category = categories.find((c) => c.id === item.category_id);

  function run(action: () => Promise<void>) {
    setMenuOpen(false);
    startTransition(() => {
      void action();
    });
  }

  return (
    <>
      <article
        className={`group relative overflow-hidden rounded-2xl border border-line bg-surface transition hover:shadow-md ${
          pending ? "opacity-50" : ""
        } ${item.status !== "pending" ? "opacity-75" : ""}`}
      >
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="block">
          <div className="relative aspect-4/3 bg-stone-100">
            {item.image_url ? (
              isStored ? (
                <Image
                  src={item.image_url}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  className="object-cover"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image_url} alt="" loading="lazy" className="size-full object-cover" />
              )
            ) : (
              <div className="flex size-full flex-col items-center justify-center gap-2 text-subtle">
                {item.favicon_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.favicon_url} alt="" className="size-8 rounded" />
                )}
                <span className="px-2 text-center text-[11px]">{item.domain}</span>
              </div>
            )}

            {item.status === "bought" && (
              <span className="absolute left-2 top-2 rounded-full bg-ink px-2 py-0.5 text-[10px] font-medium text-white">
                Comprado
              </span>
            )}
            {item.status === "discarded" && (
              <span className="absolute left-2 top-2 rounded-full bg-stone-500 px-2 py-0.5 text-[10px] font-medium text-white">
                Descartado
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1 p-3">
            <div className="flex items-center gap-1.5">
              {item.favicon_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.favicon_url} alt="" className="size-3 shrink-0 rounded-sm" />
              )}
              <span className="truncate text-[11px] text-subtle">{item.domain}</span>
            </div>

            <h3 className="line-clamp-2 text-sm font-medium leading-snug">
              {item.title || item.url}
            </h3>

            {price && <p className="text-sm font-semibold">{price}</p>}

            {item.note && <p className="line-clamp-1 text-xs text-muted">{item.note}</p>}

            {(category || item.tags.length > 0) && (
              <div className="mt-1 flex flex-wrap gap-1">
                {category && (
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] text-muted">
                    {category.emoji ? `${category.emoji} ` : ""}
                    {category.name}
                  </span>
                )}
                {item.tags.slice(0, 2).map((tag) => (
                  <span key={tag} className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] text-muted">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </a>

        <div ref={menuRef} className="absolute right-2 top-2">
          <button
            type="button"
            aria-label="Opciones"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex size-7 items-center justify-center rounded-lg bg-surface/90 text-muted shadow-sm backdrop-blur transition hover:text-ink sm:opacity-0 sm:group-hover:opacity-100"
          >
            <MoreHorizontal className="size-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-8 z-10 w-44 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-lg">
              <MenuItem
                icon={<Pencil className="size-3.5" />}
                label="Editar"
                onClick={() => {
                  setMenuOpen(false);
                  setEditing(true);
                }}
              />
              {item.status === "pending" ? (
                <>
                  <MenuItem
                    icon={<Check className="size-3.5" />}
                    label="Marcar comprado"
                    onClick={() => run(() => setItemStatus(item.id, "bought"))}
                  />
                  <MenuItem
                    icon={<X className="size-3.5" />}
                    label="Descartar"
                    onClick={() => run(() => setItemStatus(item.id, "discarded"))}
                  />
                </>
              ) : (
                <MenuItem
                  icon={<RotateCcw className="size-3.5" />}
                  label="Volver a pendiente"
                  onClick={() => run(() => setItemStatus(item.id, "pending"))}
                />
              )}
              <MenuItem
                icon={<Trash2 className="size-3.5" />}
                label="Borrar"
                destructive
                onClick={() => {
                  if (confirm("¿Borrar este link de la lista?")) run(() => deleteItem(item.id));
                  else setMenuOpen(false);
                }}
              />
            </div>
          )}
        </div>
      </article>

      <EditItemDialog
        open={editing}
        onClose={() => setEditing(false)}
        item={item}
        categories={categories}
      />
    </>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  destructive,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition hover:bg-stone-100 ${
        destructive ? "text-brand" : "text-ink"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
