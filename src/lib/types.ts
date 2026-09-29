export type ItemStatus = "pending" | "bought" | "discarded";

export const STATUS_LABELS: Record<ItemStatus, string> = {
  pending: "Pendiente",
  bought: "Comprado",
  discarded: "Descartado",
};

export type Category = {
  id: string;
  user_id: string;
  name: string;
  emoji: string | null;
  position: number;
  created_at: string;
};

export type Item = {
  id: string;
  user_id: string;
  category_id: string | null;
  url: string;
  canonical_url: string;
  domain: string | null;
  site_name: string | null;
  title: string | null;
  description: string | null;
  image_url: string | null;
  favicon_url: string | null;
  price_amount: number | null;
  price_currency: string | null;
  status: ItemStatus;
  note: string | null;
  tags: string[];
  /** Último clic al link desde la app. */
  last_opened_at: string | null;
  /** Lo pone un trigger al pasar a "bought"; se limpia si vuelve a otro estado. */
  purchased_at: string | null;
  /** Respuesta a "¿Lo compraste desde Wish Links?"; null = no contestó. */
  purchase_source: PurchaseSource | null;
  created_at: string;
  updated_at: string;
};

export type PurchaseSource = "wish_links" | "other";

/** Link público de solo lectura. `category_id` null = toda la lista. */
export type ShareLink = {
  id: string;
  user_id: string;
  category_id: string | null;
  token: string;
  created_at: string;
};

/** Lo que devuelve la función `get_shared_wishlist`: solo campos públicos, sin notas ni tags. */
export type SharedItem = Pick<
  Item,
  "id" | "url" | "domain" | "title" | "image_url" | "favicon_url" | "price_amount" | "price_currency"
> & {
  category_name: string | null;
  category_emoji: string | null;
};

export type SharedWishlist = {
  category: { name: string; emoji: string | null } | null;
  items: SharedItem[];
};

/** Lo que devuelve /api/preview al pegar un link. */
export type LinkPreview = {
  url: string;
  canonicalUrl: string;
  domain: string;
  siteName: string | null;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  faviconUrl: string;
  priceAmount: number | null;
  priceCurrency: string | null;
  /** true cuando la página no dejó leer nada y hay que completar a mano. */
  blocked: boolean;
};
