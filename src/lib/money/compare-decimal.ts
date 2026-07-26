export function compareDecimalStrings(left: string, right: string): number {
  const toScaledInteger = (value: string) => {
    const [whole = "0", fraction = ""] = value.split(".");
    return BigInt(`${whole}${fraction.padEnd(6, "0")}`);
  };

  const leftValue = toScaledInteger(left);
  const rightValue = toScaledInteger(right);

  if (leftValue === rightValue) return 0;
  return leftValue < rightValue ? -1 : 1;
}
