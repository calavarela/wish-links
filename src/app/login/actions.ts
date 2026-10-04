"use server";

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
