export function formatPrice(amount: number | null, currency: string | null): string | null {
  if (amount === null) return null;
  const code = (currency ?? "ARS").toUpperCase();
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: code,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${code} ${amount.toLocaleString("es-AR")}`;
  }
}

/** Tiene un precio de lista (tachado) por encima del actual. */
export function isOnPromo(item: { price_amount: number | null; list_price_amount: number | null }): boolean {
  return (
    item.price_amount !== null && item.list_price_amount !== null && Number(item.list_price_amount) > Number(item.price_amount)
  );
}

/** Variación entre dos precios en %, o null si no se puede calcular. */
export function priceChangePct(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous <= 0 || current === previous) return null;
  return ((current - previous) / previous) * 100;
}

/** "-12%" / "+5%"; con un decimal si el cambio es menor a 1%. */
export function formatPct(pct: number): string {
  const abs = Math.abs(pct);
  const value = abs < 1 ? abs.toLocaleString("es-AR", { maximumFractionDigits: 1 }) : Math.round(abs).toString();
  return `${pct < 0 ? "-" : "+"}${value}%`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}
