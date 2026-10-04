import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, ArrowLeft, ChevronRight, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { SharedList } from "@/lib/types";
import CreateListForm from "@/components/create-list-form";

export const metadata: Metadata = {
  title: "Listas compartidas · Wish Links",
};

export default async function SharedListsPage(props: PageProps<"/listas">) {
  const { invitacion } = await props.searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // RLS: solo vuelven las listas de las que es miembro.
  const [{ data: lists }, { data: members }, { data: items }] = await Promise.all([
    supabase.from("shared_lists").select("*").order("created_at", { ascending: false }),
    supabase.from("shared_list_members").select("list_id"),
    supabase.from("items").select("shared_list_id").not("shared_list_id", "is", null).eq("status", "pending"),
  ]);

  const listRows = (lists ?? []) as SharedList[];
  const count = (rows: { [key: string]: unknown }[] | null, key: string, id: string) =>
    (rows ?? []).filter((row) => row[key] === id).length;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 py-6 sm:px-6">
      <Link href="/" className="inline-flex items-center gap-1.5 self-start text-xs text-muted transition hover:text-ink">
        <ArrowLeft className="size-3.5" />
        Volver a mi lista
      </Link>

      <h1 className="mt-5 text-xl font-semibold tracking-tight">Listas compartidas</h1>
      <p className="mt-1 text-sm text-muted">
        Armá una lista con otras personas: todas pueden agregar, editar y marcar como comprado.
      </p>

      {invitacion === "invalida" && (
        <p className="mt-4 flex items-center gap-2 rounded-lg bg-brand-soft px-3 py-2 text-xs text-brand">
          <AlertCircle className="size-3.5 shrink-0" />
          Ese link de invitación ya no funciona. Pedile uno nuevo a quien creó la lista.
        </p>
      )}

      <CreateListForm />

      {listRows.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-line px-6 py-16 text-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-brand-soft">
            <Users className="size-5 text-brand" strokeWidth={2.2} />
          </div>
          <p className="text-sm font-medium">Todavía no tenés listas compartidas</p>
          <p className="mt-1 max-w-xs text-xs text-muted">
            Creá una arriba (por ejemplo &ldquo;Casa nueva&rdquo; o &ldquo;Regalos de casamiento&rdquo;) y pasale el link a
            quien quieras.
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {listRows.map((list) => {
            const people = count(members, "list_id", list.id);
            const pending = count(items, "shared_list_id", list.id);
            return (
              <li key={list.id} className="min-w-0">
                <Link
                  href={`/listas/${list.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 transition hover:border-ink"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-lg">
                    {list.emoji || <Users className="size-4 text-muted" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{list.name}</span>
                    <span className="block truncate text-[11px] text-subtle">
                      {people} {people === 1 ? "persona" : "personas"} · {pending}{" "}
                      {pending === 1 ? "pendiente" : "pendientes"}
                      {list.owner_id !== user?.id && " · te sumaron"}
                    </span>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-subtle" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
