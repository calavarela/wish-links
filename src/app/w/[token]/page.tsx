import { cache } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Heart } from "lucide-react";
import SharedItemLink from "@/components/shared-item-link";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/format";
import type { SharedItem, SharedWishlist } from "@/lib/types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

/** Compartido entre generateMetadata y la página, así la base se consulta una sola vez. */
const getWishlist = cache(async (token: string): Promise<SharedWishlist | null> => {
  if (!/^[0-9a-f]{32}$/.test(token)) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_shared_wishlist", { p_token: token });
  return (data as SharedWishlist | null) ?? null;
});

function headingFor(list: SharedWishlist): string {
  return list.category
    ? `${list.category.emoji ? `${list.category.emoji} ` : ""}${list.category.name}`
    : "Lista de deseos";
}

export async function generateMetadata(props: PageProps<"/w/[token]">): Promise<Metadata> {
  const { token } = await props.params;
  const list = await getWishlist(token);
  if (!list) return { title: "Wish Links", robots: { index: false, follow: false } };

  const count = list.items.length;
  const cover = list.items.find((item) => item.image_url)?.image_url;
  return {
    title: `${headingFor(list)} · Wish Links`,
    description: `${count} ${count === 1 ? "cosa" : "cosas"} en esta lista de deseos.`,
    // Es un link privado: que no aparezca en buscadores.
    robots: { index: false, follow: false },
    openGraph: cover ? { images: [cover] } : undefined,
  };
}

export default async function SharedWishlistPage(props: PageProps<"/w/[token]">) {
  const { token } = await props.params;
  const list = await getWishlist(token);
  if (!list) notFound();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col">
      <header className="flex items-center gap-2 border-b border-line px-4 py-3 sm:px-6">
        <div className="flex size-8 items-center justify-center rounded-xl bg-brand-soft">
          <Heart className="size-4 text-brand" strokeWidth={2.4} />
        </div>
        <span className="text-sm font-semibold tracking-tight">Wish Links</span>
      </header>

      <main className="flex-1 px-4 pb-24 pt-6 sm:px-6">
        <h1 className="text-xl font-semibold tracking-tight">{headingFor(list)}</h1>
        <p className="mb-5 mt-1 text-xs text-muted">
          {list.items.length === 0
            ? "Por ahora no hay nada en esta lista."
            : `${list.items.length} ${list.items.length === 1 ? "link" : "links"}`}
        </p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {list.items.map((item) => (
            <SharedCard key={item.id} item={item} token={token} showCategory={!list.category} />
          ))}
        </div>
      </main>

      <footer className="flex flex-col items-center gap-2 px-4 pb-8 text-xs text-subtle sm:px-6">
        <Link href="/login" className="font-medium text-ink transition hover:text-brand">
          Armá tu propia lista en Wish Links
        </Link>
        <p>© {new Date().getFullYear()} Wish Links</p>
      </footer>
    </div>
  );
}

function SharedCard({
  item,
  token,
  showCategory,
}: {
  item: SharedItem;
  token: string;
  showCategory: boolean;
}) {
  const price = formatPrice(item.price_amount, item.price_currency);
  const isStored = Boolean(item.image_url && SUPABASE_URL && item.image_url.startsWith(SUPABASE_URL));

  return (
    <SharedItemLink
      href={`/go/${item.id}?s=${token}`}
      domain={item.domain}
      hasPrice={item.price_amount !== null}
      scope={showCategory ? "all" : "category"}
      className="block overflow-hidden rounded-2xl border border-line bg-surface transition hover:shadow-md"
    >
      <div className="relative aspect-4/3 bg-stone-100">
        {item.image_url ? (
          isStored ? (
            <Image
              src={item.image_url}
              alt=""
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              className="object-cover"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.image_url} alt="" loading="lazy" className="size-full object-cover" />
          )
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 text-subtle">
            {item.favicon_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.favicon_url} alt="" className="size-8 rounded" />
            )}
            <span className="px-2 text-center text-[11px]">{item.domain}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1 p-3">
        <div className="flex items-center gap-1.5">
          {item.favicon_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.favicon_url} alt="" className="size-3 shrink-0 rounded-sm" />
          )}
          <span className="truncate text-[11px] text-subtle">{item.domain}</span>
        </div>

        <h3 className="line-clamp-2 text-sm font-medium leading-snug">{item.title || item.url}</h3>

        {price && <p className="text-sm font-semibold">{price}</p>}

        {showCategory && item.category_name && (
          <span className="mt-1 self-start rounded-full bg-stone-100 px-2 py-0.5 text-[10px] text-muted">
            {item.category_emoji ? `${item.category_emoji} ` : ""}
            {item.category_name}
          </span>
        )}
      </div>
    </SharedItemLink>
  );
}
