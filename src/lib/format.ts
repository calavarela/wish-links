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

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}
