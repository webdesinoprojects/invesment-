import { formatDecimalCurrency } from "../shared/format-decimal";

export function adminMoney(value: { toString(): string } | string | null | undefined) {
  return formatDecimalCurrency(value);
}

export function adminDate(value: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(value);
}
