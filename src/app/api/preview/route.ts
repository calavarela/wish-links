import { NextResponse } from "next/server";
import { fetchPreview } from "@/lib/preview";
import { createClient } from "@/lib/supabase/server";
import { normalizeUrlInput } from "@/lib/url";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Sin sesión no se usa: evita que la ruta funcione como proxy abierto.
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido" }, { status: 400 });
  }

  const url = normalizeUrlInput(body.url ?? "");
  if (!url) {
    return NextResponse.json({ error: "Ese link no parece válido" }, { status: 400 });
  }

  const preview = await fetchPreview(url);

  // Avisa si ese producto ya está guardado, para no duplicarlo.
  const { data: existing } = await supabase
    .from("items")
    .select("id, title, category_id")
    .eq("canonical_url", preview.canonicalUrl)
    .maybeSingle();

  return NextResponse.json({ preview, existing: existing ?? null });
}
