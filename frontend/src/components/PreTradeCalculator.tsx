import { useState } from "react";
import { calculateTrade } from "../services/trading/positionSizeCalculator";

export default function PreTradeCalculator() {
  const [contracts, setContracts] = useState(1000);
  const [entryPrice, setEntryPrice] = useState(100);
  const [stopLoss, setStopLoss] = useState<number | "">("");
  const [target, setTarget] = useState<number | "">("");
  const [direction, setDirection] = useState<"LONG" | "SHORT">("LONG");

  const result = calculateTrade({
    contracts,
    entryPrice,
    stopLoss: stopLoss === "" ? null : Number(stopLoss),
    target: target === "" ? null : Number(target),
    direction,
  });

  return (
    <div className="max-w-md mx-auto p-6 bg-gray-900 text-white rounded-xl space-y-5">

      <h2 className="text-xl font-bold">Trade Calculator</h2>

      {/* BUY / SELL Toggle */}
      <div className="flex rounded-lg overflow-hidden border border-gray-700">
        <button
          onClick={() => setDirection("LONG")}
          className={`w-1/2 py-2 font-semibold transition ${
            direction === "LONG"
              ? "bg-green-600"
              : "bg-gray-800 hover:bg-gray-700"
          }`}
        >
          BUY (LONG)
        </button>

        <button
          onClick={() => setDirection("SHORT")}
          className={`w-1/2 py-2 font-semibold transition ${
            direction === "SHORT"
              ? "bg-red-600"
              : "bg-gray-800 hover:bg-gray-700"
          }`}
        >
          SELL (SHORT)
        </button>
      </div>

      {/* Contracts */}
      <div>
        <label className="text-sm text-gray-400">Contracts</label>
        <input
          type="number"
          value={contracts}
          onChange={(e) => setContracts(Number(e.target.value))}
          className="w-full mt-1 p-2 bg-gray-800 rounded"
        />
      </div>

      {/* Entry Price */}
      <div>
        <label className="text-sm text-gray-400">Entry Price</label>
        <input
          type="number"
          value={entryPrice}
          onChange={(e) => setEntryPrice(Number(e.target.value))}
          className="w-full mt-1 p-2 bg-gray-800 rounded"
        />
      </div>

      {/* Stop Loss */}
      <div>
        <label className="text-sm text-gray-400">Stop Loss (optional)</label>
        <input
          type="number"
          value={stopLoss}
          onChange={(e) =>
            setStopLoss(e.target.value === "" ? "" : Number(e.target.value))
          }
          className="w-full mt-1 p-2 bg-gray-800 rounded"
        />
      </div>

      {/* Target */}
      <div>
        <label className="text-sm text-gray-400">Target (optional)</label>
        <input
          type="number"
          value={target}
          onChange={(e) =>
            setTarget(e.target.value === "" ? "" : Number(e.target.value))
          }
          className="w-full mt-1 p-2 bg-gray-800 rounded"
        />
      </div>

      {/* Results */}
      <div className="border-t border-gray-700 pt-4 space-y-2 text-sm">

        <div className="flex justify-between">
          <span className="text-gray-400">Contracts</span>
          <span>{result.contracts}</span>
        </div>

        {/* Risk */}
        {result.risk != null && (
          <>
            <div className="flex justify-between text-red-400">
              <span>Risk</span>
              <span>{result.risk.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-gray-400">
              <span>Risk Charges</span>
              <span>{result.riskCharges?.toFixed(2)}</span>
            </div>

            <div className="flex justify-between font-semibold text-red-500">
              <span>Total Risk</span>
              <span>{result.totalRisk?.toFixed(2)}</span>
            </div>
          </>
        )}

        {/* Profit */}
        {result.profit != null && (
          <>
            <div className="flex justify-between text-green-400">
              <span>Profit</span>
              <span>{result.profit.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-gray-400">
              <span>Profit Charges</span>
              <span>{result.profitCharges?.toFixed(2)}</span>
            </div>

            <div className="flex justify-between font-semibold text-green-500">
              <span>Total Profit</span>
              <span>{result.totalProfit?.toFixed(2)}</span>
            </div>
          </>
        )}

      </div>
    </div>
  );
}