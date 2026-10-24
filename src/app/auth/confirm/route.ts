import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { RECOVERY_COOKIE } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Destino de los links que manda Supabase por mail (recuperar contraseña).
 * Acepta los dos formatos:
 * - `?token_hash=…&type=recovery`: funciona aunque el mail se abra en otro
 *   dispositivo. Requiere cambiar la plantilla del mail en Supabase.
 * - `?code=…` (PKCE, la plantilla por defecto): solo en el mismo navegador
 *   donde se pidió el mail.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;
  const code = params.get("code");
  const next = safeNext(params.get("next"));

  const supabase = await createClient();
  let ok = false;
  let recovery = type === "recovery";

  if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
  } else if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
    // Con PKCE no viene el tipo: si el destino es cambiar la contraseña, fue una recuperación.
    recovery = next === "/perfil/contrasena";
  }

  if (!ok) {
    const failed = new URL("/recuperar", request.url);
    failed.searchParams.set("error", "link");
    return NextResponse.redirect(failed);
  }

  const response = NextResponse.redirect(new URL(next, request.url));
  if (recovery) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      // 15 minutos para elegir la contraseña nueva sin escribir la actual.
      response.cookies.set(RECOVERY_COOKIE, user.id, {
        httpOnly: true,
        sameSite: "lax",
        secure: request.nextUrl.protocol === "https:",
        maxAge: 15 * 60,
        path: "/",
      });
    }
  }
  return response;
}

function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
}
