import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import { codesForDomain } from "@/lib/discount-codes";
import { createClient } from "@/lib/supabase/server";
import type { DiscountCode, Item, ItemStatus, SharedList, SharedListPerson } from "@/lib/types";
import { isSameStore } from "@/lib/url";
import ItemCard from "@/components/item-card";
import SharedListActions from "@/components/shared-list-actions";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SECTIONS: { status: ItemStatus; title: string }[] = [
  { status: "pending", title: "Pendientes" },
  { status: "bought", title: "Comprados" },
  { status: "discarded", title: "Descartados" },
];

async function loadList(id: string) {
  if (!UUID.test(id)) return null;
  const supabase = await createClient();

  // RLS: si no es miembro, la lista no vuelve y es un 404.
  const { data: list } = await supabase.from("shared_lists").select("*").eq("id", id).maybeSingle();
  if (!list) return null;

  const [{ data: items }, { data: people }, { data: stores }, { data: codes }, { data: auth }] = await Promise.all([
    supabase.from("items").select("*").eq("shared_list_id", id).order("created_at", { ascending: false }),
    supabase.rpc("shared_list_people", { p_list: id }),
    supabase.from("stores").select("domain"),
    supabase.from("discount_codes").select("*"),
    supabase.auth.getUser(),
  ]);

  return {
    list: list as SharedList,
    items: (items ?? []) as Item[],
    people: (people ?? []) as SharedListPerson[],
    storeDomains: (stores ?? []).map((store) => store.domain as string),
    codes: (codes ?? []) as DiscountCode[],
    userId: auth.user?.id ?? null,
  };
}

export async function generateMetadata(props: PageProps<"/listas/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const data = await loadList(id);
  return { title: `${data?.list.name ?? "Lista"} · Wish Links` };
}

export default async function SharedListPage(props: PageProps<"/listas/[id]">) {
  const { id } = await props.params;
  const data = await loadList(id);
  if (!data) notFound();

  const { list, items, people, storeDomains, codes, userId } = data;
  const isOwner = list.owner_id === userId;
  const emailOf = (uid: string) => people.find((p) => p.user_id === uid)?.email ?? null;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col px-4 py-6 sm:px-6">
      <Link href="/listas" className="inline-flex items-center gap-1.5 self-start text-xs text-muted transition hover:text-ink">
        <ArrowLeft className="size-3.5" />
        Listas compartidas
      </Link>

      <header className="mt-5 flex flex-wrap items-center gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-stone-100 text-2xl">
          {list.emoji || <Users className="size-5 text-muted" />}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold tracking-tight">{list.name}</h1>
          <p className="truncate text-xs text-muted">
            {people.length} {people.length === 1 ? "persona" : "personas"}
            {!isOwner && emailOf(list.owner_id) && ` · creada por ${emailOf(list.owner_id)}`}
          </p>
        </div>
        <SharedListActions list={list} people={people} isOwner={isOwner} userId={userId} />
      </header>

      {items.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-line px-6 py-12 text-center text-sm text-muted">
          La lista está vacía. Tocá <span className="font-medium text-ink">Agregar</span> y pegá el link de un producto.
        </p>
      ) : (
        SECTIONS.map(({ status, title }) => {
          const list = items.filter((item) => item.status === status);
          if (list.length === 0) return null;
          return (
            <section key={status} className="mt-8">
              <h2 className="mb-3 text-sm font-semibold">
                {title} <span className="font-normal text-subtle">{list.length}</span>
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {list.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    categories={[]}
                    storeSaved={storeDomains.some((domain) => isSameStore(item.domain, domain))}
                    discountCode={codesForDomain(codes, item.domain)[0] ?? null}
                    // Con más de una persona sirve saber quién lo sumó; del mail alcanza con la parte antes de la @.
                    addedBy={
                      people.length > 1
                        ? item.user_id === userId
                          ? "vos"
                          : (emailOf(item.user_id)?.split("@")[0] ?? null)
                        : null
                    }
                  />
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
