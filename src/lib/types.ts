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
  created_at: string;
  updated_at: string;
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
