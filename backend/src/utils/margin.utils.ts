
// margin required to open position
// formula: (qty × price) / leverage
export function calcRequiredMargin(
  qty: number,
  price: number,
  leverage: number
): number {
  return (qty * price) / leverage
}

// margin level = (balance / marginUsed) × 100
// below 100% = margin call territory
// below 50%  = liquidation territory
export function calcMarginLevel(balance: number, marginUsed: number): number {
  if (marginUsed === 0) return Infinity
  return (balance / marginUsed) * 100
}