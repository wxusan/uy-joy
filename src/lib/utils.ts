export function formatPrice(amount: number): string {
  if (amount >= 1_000_000_000) {
    const val = amount / 1_000_000_000;
    return val % 1 === 0 ? `${val} mlrd` : `${val.toFixed(2)} mlrd`;
  }
  if (amount >= 1_000_000) {
    const val = Math.round(amount / 1_000_000);
    return `${val} mln`;
  }
  if (amount >= 1_000) {
    const val = Math.round(amount / 1_000);
    return `${val} ming`;
  }
  return amount.toLocaleString("ru-RU");
}

export function calculateUnitPrice(
  area: number,
  unitPricePerM2: number | null,
  floorBasePricePerM2: number | null,
  totalPriceOverride: number | null
): number {
  if (totalPriceOverride) return totalPriceOverride;
  const pricePerM2 = unitPricePerM2 || floorBasePricePerM2 || 0;
  return pricePerM2 * area;
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "available":
      return "#22c55e";
    case "reserved":
      return "#eab308";
    case "sold":
      return "#ef4444";
    default:
      return "#94a3b8";
  }
}

export function getStatusBg(status: string): string {
  switch (status) {
    case "available":
      return "bg-green-100 text-green-800";
    case "reserved":
      return "bg-yellow-100 text-yellow-800";
    case "sold":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}
