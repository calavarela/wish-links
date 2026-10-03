import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Store as StoreIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Item, Store } from "@/lib/types";
import { isSameStore } from "@/lib/url";
import AddStoreForm from "@/components/add-store-form";
import StoreCard from "@/components/store-card";

export const metadata: Metadata = {
  title: "Tiendas favoritas · Wish Links",
};

export default async function StoresPage() {
  const supabase = await createClient();
  const [{ data: stores }, { data: items }] = await Promise.all([
    supabase.from("stores").select("*").order("name"),
    supabase.from("items").select("domain, status"),
  ]);

  const storeList = (stores ?? []) as Store[];
  const itemList = (items ?? []) as Pick<Item, "domain" | "status">[];

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 py-6 sm:px-6">
      <Link href="/" className="inline-flex items-center gap-1.5 self-start text-xs text-muted transition hover:text-ink">
        <ArrowLeft className="size-3.5" />
        Volver a mi lista
      </Link>

      <h1 className="mt-5 text-xl font-semibold tracking-tight">Tiendas favoritas</h1>
      <p className="mt-1 text-sm text-muted">
        Guardá las tiendas que te gustan, aunque todavía no tengas nada suyo en la lista.
      </p>

      <AddStoreForm />

      {storeList.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-line px-6 py-16 text-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-brand-soft">
            <StoreIcon className="size-5 text-brand" strokeWidth={2.2} />
          </div>
          <p className="text-sm font-medium">Todavía no guardaste ninguna tienda</p>
          <p className="mt-1 max-w-xs text-xs text-muted">
            Pegá arriba el link de una tienda, o usá “Guardar tienda” en el menú de cualquier producto.
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {storeList.map((store) => (
            <StoreCard
              key={store.id}
              store={store}
              pendingCount={
                itemList.filter((item) => item.status === "pending" && isSameStore(item.domain, store.domain))
                  .length
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}
