import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { joinSharedList } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Invitación a una lista · Wish Links",
};

const TOKEN = /^[0-9a-f]{32}$/;

type Preview = { id: string; name: string; emoji: string | null; members: number; items: number; already_member: boolean };

/**
 * Pantalla del link de invitación. Pide sesión (la da proxy.ts, que manda a
 * /login y vuelve acá); la lista se muestra antes de sumarse para que no sea
 * una sorpresa.
 */
export default async function JoinListPage(props: PageProps<"/unirse/[token]">) {
  const { token } = await props.params;
  const supabase = await createClient();
  const { data } = TOKEN.test(token)
    ? await supabase.rpc("preview_shared_list", { p_token: token })
    : { data: null };
  const preview = data as Preview | null;

  if (preview?.already_member) redirect(`/listas/${preview.id}`);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col items-center justify-center px-4 py-10 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-brand-soft text-2xl">
        {preview?.emoji || <Users className="size-6 text-brand" strokeWidth={2.2} />}
      </div>

      {preview ? (
        <>
          <p className="text-sm text-muted">Te invitaron a la lista</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">{preview.name}</h1>
          <p className="mt-2 text-xs text-subtle">
            {preview.members} {preview.members === 1 ? "persona" : "personas"} · {preview.items}{" "}
            {preview.items === 1 ? "producto" : "productos"}
          </p>
          <p className="mt-4 text-sm text-muted">Al sumarte vas a poder agregar, editar y marcar como comprado.</p>

          <form action={joinSharedList.bind(null, token)} className="mt-6 w-full">
            <button
              type="submit"
              className="w-full rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700"
            >
              Sumarme a la lista
            </button>
          </form>
          <Link href="/" className="mt-3 text-xs text-subtle transition hover:text-ink">
            Ahora no
          </Link>
        </>
      ) : (
        <>
          <h1 className="text-lg font-semibold tracking-tight">Este link ya no funciona</h1>
          <p className="mt-2 text-sm text-muted">
            Puede que lo hayan desactivado. Pedile un link nuevo a quien creó la lista.
          </p>
          <Link
            href="/"
            className="mt-6 rounded-xl border border-line px-4 py-2.5 text-sm font-medium transition hover:border-ink"
          >
            Ir a mi lista
          </Link>
        </>
      )}
    </div>
  );
}
