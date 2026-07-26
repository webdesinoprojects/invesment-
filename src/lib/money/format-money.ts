export function formatUsd(
  value: string,
  options: { maximumFractionDigits?: number } = {},
): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return "$0.00";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: options.maximumFractionDigits ?? 4,
  }).format(amount);
}
