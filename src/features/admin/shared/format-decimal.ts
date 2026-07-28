export function formatDecimalCurrency(value: { toString(): string } | string | null | undefined): string {
  const raw = value?.toString() ?? "0";
  const negative = raw.startsWith("-");
  const unsigned = negative ? raw.slice(1) : raw;
  const [integer = "0", fraction = ""] = unsigned.split(".");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const cents = `${fraction}00`.slice(0, 2);
  return `${negative ? "-" : ""}$${grouped}.${cents}`;
}
