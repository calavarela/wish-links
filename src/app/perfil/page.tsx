import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ChevronRight, FileText, Shield, Store as StoreIcon, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import DeleteAccountButton from "@/components/delete-account-button";
import SignOutButton from "@/components/sign-out-button";

export const metadata: Metadata = {
  title: "Mi perfil · Wish Links",
};

/**
 * Datos de la cuenta y acciones sobre ella. Está pensada en secciones para ir
 * sumando configuraciones (nombre, notificaciones, moneda por defecto...).
 */
export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/perfil");

  const count = (query: PromiseLike<{ count: number | null }>) => query.then(({ count }) => count ?? 0);
  const [saved, bought, stores, lists] = await Promise.all([
    count(supabase.from("items").select("id", { count: "exact", head: true }).is("shared_list_id", null).eq("user_id", user.id)),
    count(
      supabase
        .from("items")
        .select("id", { count: "exact", head: true })
        .is("shared_list_id", null)
        .eq("user_id", user.id)
        .eq("status", "bought"),
    ),
    count(supabase.from("stores").select("id", { count: "exact", head: true })),
    count(supabase.from("shared_list_members").select("list_id", { count: "exact", head: true }).eq("user_id", user.id)),
  ]);

  const email = user.email ?? "";

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 py-6 sm:px-6">
      <Link href="/" className="inline-flex items-center gap-1.5 self-start text-xs text-muted transition hover:text-ink">
        <ArrowLeft className="size-3.5" />
        Volver a mi lista
      </Link>

      <header className="mt-6 flex flex-col items-center text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-ink text-2xl font-semibold uppercase text-white">
          {email.charAt(0) || "?"}
        </div>
        <h1 className="mt-3 max-w-full truncate text-lg font-semibold tracking-tight">{email}</h1>
      </header>

      <dl className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Guardados" value={saved} />
        <Stat label="Comprados" value={bought} />
        <Stat label="Tiendas" value={stores} />
        <Stat label="Listas" value={lists} />
      </dl>

      <Section title="Cuenta">
        <Row label="Email" value={email} />
        <Row label="Miembro desde" value={formatDate(user.created_at)} />
      </Section>

      <Section title="Atajos">
        <LinkRow href="/tiendas" icon={<StoreIcon className="size-4" />} label="Tiendas favoritas" />
        <LinkRow href="/listas" icon={<Users className="size-4" />} label="Listas compartidas" />
      </Section>

      <Section title="Legal">
        <LinkRow href="/terminos" icon={<FileText className="size-4" />} label="Términos y condiciones" />
        <LinkRow href="/privacidad" icon={<Shield className="size-4" />} label="Política de privacidad" />
      </Section>

      <Section title="Sesión">
        <SignOutButton />
        <DeleteAccountButton />
      </Section>

      <p className="mt-8 text-center text-xs text-subtle">© {new Date().getFullYear()} Wish Links</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-3 text-center">
      <dd className="text-lg font-semibold tracking-tight">{value}</dd>
      <dt className="text-[11px] text-subtle">{label}</dt>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 px-1 text-xs font-medium text-subtle">{title}</h2>
      <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
      <span className="text-muted">{label}</span>
      <span className="min-w-0 truncate">{value}</span>
    </div>
  );
}

function LinkRow({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3 text-sm transition hover:bg-stone-50">
      <span className="text-muted">{icon}</span>
      <span className="flex-1">{label}</span>
      <ChevronRight className="size-4 text-subtle" />
    </Link>
  );
}
