"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Check, MoreHorizontal, Pencil, RotateCcw, Trash2, X } from "lucide-react";
import posthog from "posthog-js";
import { deleteItem, setItemStatus } from "@/app/actions";
import { formatPrice } from "@/lib/format";
import { CURRENCIES, type Category, type Item, type PurchaseSource } from "@/lib/types";
import Dialog from "./dialog";
import EditItemDialog from "./edit-item-dialog";
import { fieldClass } from "./item-fields";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

export default function ItemCard({ item, categories }: { item: Item; categories: Category[] }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [askingSource, setAskingSource] = useState(false);
  const closeAsk = useCallback(() => setAskingSource(false), []);
  const [paidAmount, setPaidAmount] = useState("");
  const [paidCurrency, setPaidCurrency] = useState("ARS");
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
  const paid = formatPrice(item.paid_amount, item.paid_currency);
  const isStored = Boolean(item.image_url && SUPABASE_URL && item.image_url.startsWith(SUPABASE_URL));
  const category = categories.find((c) => c.id === item.category_id);

  function run(action: () => Promise<void>) {
    setMenuOpen(false);
    startTransition(() => {
      void action();
    });
  }

  function trackOpen() {
    posthog.capture("item_opened", {
      domain: item.domain,
      has_price: item.price_amount !== null,
      status: item.status,
    });
  }

  function askPurchase() {
    setMenuOpen(false);
    setPaidAmount("");
    setPaidCurrency(item.price_currency ?? "ARS");
    setAskingSource(true);
  }

  function markBought(source: PurchaseSource | null) {
    setAskingSource(false);
    const daysSinceOpen = item.last_opened_at
      ? Math.floor((Date.now() - new Date(item.last_opened_at).getTime()) / 86_400_000)
      : null;
    const paid = Number.parseFloat(paidAmount.replace(",", "."));
    const hasPaid = Number.isFinite(paid) && paid >= 0;
    // Solo se compara si está en la misma moneda: sin cotización, otra cosa no tiene sentido.
    const paidVsListedPct =
      hasPaid && item.price_amount && (item.price_currency ?? "ARS") === paidCurrency
        ? Math.round(((paid - item.price_amount) / item.price_amount) * 100)
        : null;
    posthog.capture("item_status_changed", {
      from_status: item.status,
      to_status: "bought",
      purchase_source: source ?? "unanswered",
      opened_from_app: daysSinceOpen !== null,
      days_since_last_open: daysSinceOpen,
      has_paid_amount: hasPaid,
      paid_vs_listed_pct: paidVsListedPct,
    });
    run(() => setItemStatus(item.id, "bought", { source, paidAmount, paidCurrency }));
  }

  return (
    <>
      <article
        className={`group relative overflow-hidden rounded-2xl border border-line bg-surface transition hover:shadow-md ${
          pending ? "opacity-50" : ""
        } ${item.status !== "pending" ? "opacity-75" : ""}`}
      >
        <a
          href={`/go/${item.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
          onClick={trackOpen}
          // Clic con la rueda del mouse: abre en otra pestaña sin disparar onClick.
          onAuxClick={(event) => {
            if (event.button === 1) trackOpen();
          }}
        >
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

            {item.status === "bought" && paid && <p className="text-xs text-muted">Pagaste {paid}</p>}

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
                    onClick={askPurchase}
                  />
                  <MenuItem
                    icon={<X className="size-3.5" />}
                    label="Descartar"
                    onClick={() => {
                      posthog.capture("item_status_changed", { from_status: item.status, to_status: "discarded" });
                      run(() => setItemStatus(item.id, "discarded"));
                    }}
                  />
                </>
              ) : (
                <MenuItem
                  icon={<RotateCcw className="size-3.5" />}
                  label="Volver a pendiente"
                  onClick={() => {
                    posthog.capture("item_status_changed", { from_status: item.status, to_status: "pending" });
                    run(() => setItemStatus(item.id, "pending"));
                  }}
                />
              )}
              <MenuItem
                icon={<Trash2 className="size-3.5" />}
                label="Borrar"
                destructive
                onClick={() => {
                  if (confirm("¿Borrar este link de la lista?")) {
                    posthog.capture("item_deleted");
                    run(() => deleteItem(item.id));
                  } else setMenuOpen(false);
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

      {/* Cerrar con la X o tocando afuera cancela: puede haber sido un toque sin querer. */}
      <Dialog open={askingSource} onClose={closeAsk} title="¡Qué bueno que lo compraste!">
        <div className="flex flex-col gap-4 p-5">
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted">¿Cuánto pagaste? (opcional)</span>
              <input
                className={fieldClass}
                inputMode="decimal"
                value={paidAmount}
                onChange={(event) => setPaidAmount(event.target.value)}
                placeholder={item.price_amount !== null ? String(item.price_amount) : "0"}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted">Moneda</span>
              <select
                className={`${fieldClass} pr-8`}
                value={paidCurrency}
                onChange={(event) => setPaidCurrency(event.target.value)}
              >
                {CURRENCIES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <p className="text-sm text-muted">
            ¿Lo compraste entrando desde el link de Wish Links? Nos ayuda a saber si la app te sirve.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => markBought("wish_links")}
              className="flex-1 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700"
            >
              Sí, desde Wish Links
            </button>
            <button
              type="button"
              onClick={() => markBought("other")}
              className="flex-1 rounded-xl border border-line px-4 py-2.5 text-sm font-medium transition hover:border-ink"
            >
              No, por otro lado
            </button>
          </div>
          <button
            type="button"
            onClick={() => markBought(null)}
            className="self-center text-xs text-subtle transition hover:text-ink"
          >
            Prefiero no responder
          </button>
        </div>
      </Dialog>
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
