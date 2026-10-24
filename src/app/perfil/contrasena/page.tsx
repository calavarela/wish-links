import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { RECOVERY_COOKIE } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import ChangePasswordForm from "./change-password-form";

export const metadata: Metadata = {
  title: "Contraseña · Wish Links",
};

/** Cambiar la contraseña estando logueada, o elegir una nueva al volver del mail de recuperación. */
export default async function PasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/perfil/contrasena");

  const recovering = (await cookies()).get(RECOVERY_COOKIE)?.value === user.id;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col px-4 py-6">
      <Link href="/perfil" className="inline-flex items-center gap-1.5 self-start text-xs text-muted transition hover:text-ink">
        <ArrowLeft className="size-3.5" />
        Mi perfil
      </Link>

      <h1 className="mt-6 text-xl font-semibold tracking-tight">
        {recovering ? "Elegí una contraseña nueva" : "Cambiar contraseña"}
      </h1>
      <p className="mt-1 text-sm text-muted">
        {recovering
          ? `Para ${user.email}. Después vas a entrar con esta.`
          : "Por seguridad, primero escribí la que usás ahora."}
      </p>

      <ChangePasswordForm askCurrent={!recovering} />
    </div>
  );
}
