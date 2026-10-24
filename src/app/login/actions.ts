"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { MIN_PASSWORD, RECOVERY_COOKIE } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** `event` le dice al cliente qué registrar en analytics; `next` a dónde ir. */
export type AuthState = {
  error: string | null;
  message: string | null;
  event?: "login" | "sign_up";
  next?: string;
  user?: { id: string; email: string | null };
};

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    next: String(formData.get("next") ?? "/") || "/",
  };
}

/** Solo rutas internas, para que nadie arme un link que saque afuera. */
function safeNext(next: string): string {
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password, next } = readCredentials(formData);
  if (!email || !password) return { error: "Completá email y contraseña.", message: null };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const invalid = /invalid login credentials/i.test(error.message);
    return {
      error: invalid ? "Email o contraseña incorrectos." : error.message,
      message: null,
    };
  }

  return {
    error: null,
    message: null,
    event: "login",
    next: safeNext(next),
    user: { id: data.user.id, email: data.user.email ?? null },
  };
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password, next } = readCredentials(formData);
  if (!email || !password) return { error: "Completá email y contraseña.", message: null };
  if (password.length < 8) return { error: "La contraseña necesita al menos 8 caracteres.", message: null };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    const exists = /already registered|already exists/i.test(error.message);
    return {
      error: exists ? "Ya existe una cuenta con ese email. Iniciá sesión." : error.message,
      message: null,
    };
  }

  // Con confirmación por email activa, un email ya registrado devuelve un
  // usuario falso sin identidades: no es un registro nuevo y no se mide.
  const isNewUser = (data.user?.identities?.length ?? 0) > 0;
  const user =
    isNewUser && data.user ? { id: data.user.id, email: data.user.email ?? null } : undefined;

  // Si el proyecto pide confirmación por email, todavía no hay sesión.
  if (!data.session) {
    return {
      error: null,
      message: "Te mandamos un mail para confirmar la cuenta. Abrilo y volvé a entrar.",
      ...(user && { event: "sign_up" as const, user }),
    };
  }

  // Respeta `next`: quien llega por una invitación a una lista vuelve a ella después de registrarse.
  return { error: null, message: null, event: "sign_up", next: safeNext(next), user };
}

/**
 * Manda el mail de recuperación. La respuesta es siempre la misma, exista o no
 * la cuenta, para que el formulario no sirva para averiguar qué mails están registrados.
 */
export async function requestPasswordReset(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Escribí tu email.", message: null };

  const host = (await headers()).get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${protocol}://${host}/auth/confirm?next=/perfil/contrasena`,
  });

  // Solo el límite de envíos se muestra: es lo único que la persona puede resolver (esperando).
  if (error && /rate limit|too many|security purposes/i.test(error.message)) {
    return { error: "Pediste muchos mails seguidos. Esperá unos minutos y probá de nuevo.", message: null };
  }

  return {
    error: null,
    message: "Si hay una cuenta con ese email, te mandamos un link para elegir una contraseña nueva. Revisá también el spam.",
  };
}

/**
 * Cambia la contraseña. Logueada desde el perfil pide la actual; llegando del
 * mail de recuperación (cookie de /auth/confirm) no, porque justamente no la sabe.
 */
export async function changePassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login?next=/perfil/contrasena");

  const cookieStore = await cookies();
  const recovering = cookieStore.get(RECOVERY_COOKIE)?.value === user.id;
  const current = String(formData.get("current") ?? "");
  const password = String(formData.get("password") ?? "");
  const repeat = String(formData.get("repeat") ?? "");

  if (password.length < MIN_PASSWORD) {
    return { error: `La contraseña nueva necesita al menos ${MIN_PASSWORD} caracteres.`, message: null };
  }
  if (password !== repeat) return { error: "Las dos contraseñas nuevas no coinciden.", message: null };

  if (!recovering) {
    if (!current) return { error: "Escribí tu contraseña actual.", message: null };
    const { error } = await supabase.auth.signInWithPassword({ email: user.email, password: current });
    if (error) return { error: "La contraseña actual no es correcta.", message: null };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (/different from the old|same/i.test(error.message)) {
      return { error: "La contraseña nueva tiene que ser distinta de la actual.", message: null };
    }
    if (/weak|pwned|leaked/i.test(error.message)) {
      return { error: "Esa contraseña es muy fácil de adivinar. Probá con otra.", message: null };
    }
    return { error: "No se pudo cambiar la contraseña. Probá de nuevo.", message: null };
  }

  cookieStore.delete(RECOVERY_COOKIE);
  redirect("/perfil?contrasena=ok");
}
