import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatPrice } from "@/lib/format";
import type { Category, Item, ItemStatus, Store } from "@/lib/types";
import { faviconFor, isSameStore, isStoreDomain, storeNameFromDomain } from "@/lib/url";
import ItemCard from "@/components/item-card";
import RenameStoreButton from "@/components/rename-store-button";
import StoreFavoriteButton from "@/components/store-favorite-button";

const DOMAIN = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;
const SECTIONS: { status: ItemStatus; title: string }[] = [
  { status: "pending", title: "Pendientes" },
  { status: "bought", title: "Comprados" },
  { status: "discarded", title: "Descartados" },
];

async function loadStore(rawDomain: string) {
  const domain = decodeURIComponent(rawDomain).toLowerCase();
  if (!DOMAIN.test(domain) || !isStoreDomain(domain)) return null;

  const supabase = await createClient();
  const [{ data: store }, { data: items }, { data: categories }] = await Promise.all([
    supabase.from("stores").select("*").eq("domain", domain).maybeSingle(),
    supabase.from("items").select("*").order("created_at", { ascending: false }),
    supabase.from("categories").select("*").order("position"),
  ]);

  const storeItems = ((items ?? []) as Item[]).filter((item) => isSameStore(item.domain, domain));
  // Sin favorita ni productos no hay nada que mostrar de esa tienda.
  if (!store && storeItems.length === 0) return null;

  const name =
    (store as Store | null)?.name ??
    storeItems.find((item) => item.site_name)?.site_name ??
    storeNameFromDomain(domain);

  return {
    domain,
    name,
    store: store as Store | null,
    items: storeItems,
    categories: (categories ?? []) as Category[],
  };
}

/** Suma montos solo si están todos en la misma moneda; sin cotización no tiene sentido mezclarlas. */
function total(entries: { amount: number | null; currency: string | null }[]): string | null {
  const priced = entries.filter((e) => e.amount !== null);
  const currencies = new Set(priced.map((e) => e.currency ?? "ARS"));
  if (priced.length === 0 || currencies.size !== 1) return null;
  return formatPrice(
    priced.reduce((sum, e) => sum + Number(e.amount), 0),
    [...currencies][0],
  );
}

export async function generateMetadata(props: PageProps<"/tiendas/[domain]">): Promise<Metadata> {
  const { domain } = await props.params;
  const data = await loadStore(domain);
  return { title: `${data?.name ?? "Tienda"} · Wish Links` };
}

export default async function StorePage(props: PageProps<"/tiendas/[domain]">) {
  const { domain: rawDomain } = await props.params;
  const data = await loadStore(rawDomain);
  if (!data) notFound();

  const { domain, name, store, items, categories } = data;
  const byStatus = (status: ItemStatus) => items.filter((item) => item.status === status);
  const pending = byStatus("pending");
  const bought = byStatus("bought");
  const pendingTotal = total(pending.map((i) => ({ amount: i.price_amount, currency: i.price_currency })));
  const paidTotal = total(bought.map((i) => ({ amount: i.paid_amount, currency: i.paid_currency })));
  const firstSaved = items.at(-1)?.created_at;
  const url = store?.url ?? `https://${domain}`;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col px-4 py-6 sm:px-6">
      <Link href="/tiendas" className="inline-flex items-center gap-1.5 self-start text-xs text-muted transition hover:text-ink">
        <ArrowLeft className="size-3.5" />
        Tiendas favoritas
      </Link>

      <header className="mt-5 flex flex-wrap items-center gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-stone-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={store?.favicon_url ?? faviconFor(url)} alt="" className="size-6 rounded" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <h1 className="truncate text-xl font-semibold tracking-tight">{name}</h1>
            {/* Solo las favoritas tienen nombre propio; las demás lo toman del producto. */}
            {store && <RenameStoreButton store={store} />}
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted transition hover:text-ink"
          >
            {domain}
            <ExternalLink className="size-3" />
          </a>
        </div>
        <StoreFavoriteButton storeId={store?.id ?? null} itemId={items[0]?.id ?? null} name={name} />
      </header>

      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Pendientes" value={String(pending.length)} detail={pendingTotal} />
        <Stat label="Comprados" value={String(bought.length)} detail={paidTotal ? `Pagaste ${paidTotal}` : null} />
        <Stat label="Descartados" value={String(byStatus("discarded").length)} />
        <Stat label="Primer guardado" value={firstSaved ? formatDate(firstSaved) : "—"} />
      </dl>

      {items.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-line px-6 py-12 text-center text-sm text-muted">
          Todavía no guardaste productos de esta tienda.
        </p>
      ) : (
        SECTIONS.map(({ status, title }) => {
          const list = byStatus(status);
          if (list.length === 0) return null;
          return (
            <section key={status} className="mt-8">
              <h2 className="mb-3 text-sm font-semibold">
                {title} <span className="font-normal text-subtle">{list.length}</span>
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {list.map((item) => (
                  <ItemCard key={item.id} item={item} categories={categories} storeSaved={Boolean(store)} />
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail?: string | null }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-3">
      <dt className="text-[11px] text-subtle">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold tracking-tight">{value}</dd>
      {detail && <dd className="text-xs text-muted">{detail}</dd>}
    </div>
  );
}
