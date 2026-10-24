import { createClient } from "@/lib/supabase/server";
import type { AppNotification, Category, DiscountCode, Item, ShareLink } from "@/lib/types";
import AccountFooter from "@/components/account-footer";
import HomeContent from "@/components/home-content";

/**
 * Trae todo lo de la lista personal en un solo viaje. Los filtros y la búsqueda
 * los aplica HomeContent en el navegador, así cambiarlos no vuelve a pasar por acá.
 */
export default async function HomePage() {
  const supabase = await createClient();

  // El volumen de una wishlist personal es chico: se trae todo una vez y se
  // filtra en memoria, así los contadores de cada chip salen gratis.
  const [
    { data: categories },
    { data: allItems },
    { data: shareLinks },
    { data: stores },
    { data: notifications },
    { data: discountCodes },
    { data: auth },
  ] = await Promise.all([
    supabase.from("categories").select("*").order("position"),
    // Solo la lista personal: los productos de listas compartidas viven en /listas.
    supabase.from("items").select("*").is("shared_list_id", null).order("created_at", { ascending: false }),
    supabase.from("share_links").select("*"),
    supabase.from("stores").select("domain"),
    supabase
      .from("notifications")
      .select("id, item_id, type, data, created_at, read_at, item:items(id, title, url, domain, image_url, favicon_url)")
      .order("created_at", { ascending: false })
      .limit(30),
    supabase.from("discount_codes").select("*").order("created_at", { ascending: false }),
    supabase.auth.getUser(),
  ]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col">
      <HomeContent
        items={(allItems ?? []) as Item[]}
        categories={(categories ?? []) as Category[]}
        shareLinks={(shareLinks ?? []) as ShareLink[]}
        storeDomains={(stores ?? []).map((store) => store.domain as string)}
        discountCodes={(discountCodes ?? []) as DiscountCode[]}
        notifications={(notifications ?? []) as unknown as AppNotification[]}
        userEmail={auth.user?.email ?? null}
      />

      <AccountFooter />
    </div>
  );
}
