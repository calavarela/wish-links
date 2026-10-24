import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, KeyRound } from "lucide-react";
import ResetRequestForm from "./reset-request-form";

export const metadata: Metadata = {
  title: "Recuperar contraseña · Wish Links",
};

export default async function RecoverPage(props: PageProps<"/recuperar">) {
  const { error } = await props.searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-brand-soft">
            <KeyRound className="size-6 text-brand" strokeWidth={2.2} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Recuperar contraseña</h1>
          <p className="mt-1 text-sm text-muted">Te mandamos un link por mail para elegir una nueva.</p>
        </div>

        {error === "link" && (
          <p className="mb-4 rounded-xl bg-brand-soft px-4 py-3 text-center text-sm text-brand">
            Ese link venció o ya se usó. Pedí uno nuevo.
          </p>
        )}

        <ResetRequestForm />

        <Link
          href="/login"
          className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted transition hover:text-ink"
        >
          <ArrowLeft className="size-3.5" />
          Volver a iniciar sesión
        </Link>
      </div>
    </main>
  );
}
