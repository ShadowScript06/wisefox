export function generateLivePrices(basePrices: Record<string, number>, livePrices: Record<string, number>) {
  const result: Record<string, number> = {};

  for (const symbol in basePrices) {
    const base = basePrices[symbol];

    const prev = livePrices[symbol] ?? base;

    const noise = (Math.random() - 0.5) * 0.001;

    const drift = (base - prev) * 0.05;

    let price = prev + base * noise + drift;

    const min = base * 0.999;
    const max = base * 1.001;

    price = Math.max(min, Math.min(max, price));

    result[symbol] = Number(price.toFixed(2));
  }

  return result;
}