import { NextResponse, type NextRequest } from "next/server";
import { toAffiliateUrl } from "@/lib/affiliate";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN = /^[0-9a-f]{32}$/;

/**
 * Salida hacia la tienda. Registra el clic y redirige al link (de afiliado, si
 * hay un programa configurado para esa tienda).
 *
 * - `/go/<id>`: el dueño desde su lista. Necesita sesión.
 * - `/go/<id>?s=<token>`: alguien desde una lista compartida. Solo resuelve
 *   items que ese link comparte, así no sirve para leer otros.
 *
 * Solo redirige a URLs guardadas en la base, nunca a una que venga en el pedido.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/go/[id]">) {
  const { id } = await ctx.params;
  const token = request.nextUrl.searchParams.get("s");
  if (!UUID.test(id) || (token !== null && !TOKEN.test(token))) return notFound();

  const supabase = await createClient();
  let target: string | null = null;

  if (token) {
    const { data } = await supabase.rpc("resolve_shared_item", { p_token: token, p_item_id: id });
    target = (data as string | null) ?? null;
  } else {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      const login = new URL("/login", request.url);
      login.searchParams.set("next", `/go/${id}`);
      return NextResponse.redirect(login);
    }

    const { data } = await supabase
      .from("items")
      .update({ last_opened_at: new Date().toISOString() })
      .eq("id", id)
      .select("url")
      .maybeSingle();
    target = data?.url ?? null;
  }

  if (!target || !/^https?:\/\//i.test(target)) return notFound();

  const response = NextResponse.redirect(toAffiliateUrl(target).url, 302);
  // Cada clic tiene que pasar por acá para contarse y llevar el código vigente.
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function notFound() {
  return new NextResponse("Ese link no existe o ya no está disponible.", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
