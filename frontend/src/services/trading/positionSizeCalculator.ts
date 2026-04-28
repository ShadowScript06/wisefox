export type TradeDirection = "LONG" | "SHORT";

export type TradeInput = {
  contracts: number;
  entryPrice: number;
  stopLoss?: number | null;
  target?: number | null;
  direction: TradeDirection;
};

export type TradeResult = {
  contracts: number;

  risk?: number;
  profit?: number;

  profitBrokerage?: number;
  profitGst?: number;
  profitCharges?: number;

  riskBrokerage?: number;
  riskGst?: number;
  riskCharges?: number;

  totalRisk?: number;
  totalProfit?: number;
};

export function calculateTrade(input: TradeInput): TradeResult {
  const {
    contracts,
    entryPrice,
    stopLoss,
    target,
    direction,
  } = input;

  // ---------------- RISK ----------------
  let risk: number | undefined;
  let riskBrokerage: number | undefined;
  let riskGst: number | undefined;
  let riskCharges: number | undefined;

  if (stopLoss != null && stopLoss != 0) {
    if (direction === "LONG") {
      risk = ((entryPrice - stopLoss) * contracts) / 1000;
    } else {
      risk = ((stopLoss - entryPrice) * contracts) / 1000;
    }

    riskBrokerage =
      ((entryPrice * contracts) / 1000) * 0.0005 +
      ((stopLoss * contracts) / 1000) * 0.0005;

    riskGst = riskBrokerage * 0.18;
    riskCharges = riskBrokerage + riskGst;
  }

  // ---------------- PROFIT ----------------
  let profit: number | undefined;
  let profitBrokerage: number | undefined;
  let profitGst: number | undefined;
  let profitCharges: number | undefined;

  if (target != null && target != 0) {
    if (direction === "LONG") {
      profit = ((target - entryPrice) * contracts) / 1000;
    } else {
      profit = ((entryPrice - target) * contracts) / 1000; // FIXED BUG
    }

    profitBrokerage =
      ((entryPrice * contracts) / 1000) * 0.0005 +
      ((target * contracts) / 1000) * 0.0005;

    profitGst = profitBrokerage * 0.18;
    profitCharges = profitBrokerage + profitGst;
  }

  // ---------------- TOTALS ----------------
  const totalRisk =
    risk != null && riskCharges != null ? risk + riskCharges : undefined;

  const totalProfit =
    profit != null && profitCharges != null ? profit - profitCharges : undefined;

  return {
    contracts,

    risk,
    profit,

    riskBrokerage,
    riskGst,
    riskCharges,

    profitBrokerage,
    profitGst,
    profitCharges,

    totalRisk,
    totalProfit,
  };
}