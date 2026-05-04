import { useEffect, useState } from "react";
import { Heatmap } from "../components/HeatMap";
import { useParams } from "react-router-dom";
import axios from "axios";
import AccountActivity from "../components/AccountActivity";

/* -------------------- Types -------------------- */

type HeatmapRow = {
  date: string;
  trades: number;
  pnl: number;
};

type ApiResponse = {
  success: boolean;
  message: string;
  data: {
    summary: {
      totalTrades: number;
      winRate: number;
      totalPnl: number;
      totalCharges: number;
      profitableTrades: number;
      losingTrades: number;
    };
    heatmap: {
      startDate: string;
      endDate: string;
      data: HeatmapRow[];
    };
  };
};

/* -------------------- Hook -------------------- */

function useHeatmap(accountId?: string) {
  const [heatmap, setHeatmap] = useState<ApiResponse["data"]["heatmap"] | null>(
    null,
  );
  const [summary, setSummary] = useState<ApiResponse["data"]["summary"] | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accountId) return;

    let alive = true;

    async function fetchData() {
      try {
        setLoading(true);

        const res = await axios.get<ApiResponse>(
          `${import.meta.env.VITE_BACKEND_URL}/accounts/${accountId}/overview`,
          { withCredentials: true },
        );

        const payload = res.data.data;

        if (
          !payload ||
          !payload.heatmap ||
          !Array.isArray(payload.heatmap.data)
        ) {
          throw new Error("Invalid heatmap response");
        }

        if (!alive) return;

        setHeatmap(payload.heatmap);
        setSummary(payload.summary);
        setError(null);
      } catch (err) {
        console.error(err);
        if (alive) {
          setError("Failed to load account overview");
          setHeatmap(null);
          setSummary(null);
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    fetchData();

    return () => {
      alive = false;
    };
  }, [accountId]);

  return { heatmap, summary, loading, error };
}

/* -------------------- Page -------------------- */

export default function AccountOverview() {
  const { id } = useParams<{ id: string }>();
  const { heatmap, summary, loading, error } = useHeatmap(id);

  if (!id) {
    return (
      <div className="min-h-screen bg-[#0b0f17] text-white flex items-center justify-center">
        Invalid account
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f17] text-white px-6 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Account Overview
        </h1>
        <p className="text-sm text-gray-400">
          Trades, PnL performance & activity heatmap
        </p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className="bg-[#0f1623] border border-[#1c2433] rounded-lg p-3">
            <p className="text-xs text-gray-400">Total Trades</p>
            <p className="text-lg font-semibold">{summary.totalTrades}</p>
          </div>

          <div className="bg-[#0f1623] border border-[#1c2433] rounded-lg p-3">
            <p className="text-xs text-gray-400">Win Rate</p>
            <p className="text-lg font-semibold">{summary.winRate}%</p>
          </div>

          <div className="bg-[#0f1623] border border-[#1c2433] rounded-lg p-3">
            <p className="text-xs text-gray-400">Total PnL</p>

            <p
              className={`text-lg font-semibold ${
                summary.totalPnl > 0
                  ? "text-emerald-400"
                  : summary.totalPnl < 0
                    ? "text-rose-400"
                    : "text-gray-300"
              }`}
            >
              {summary.totalPnl.toFixed(2)}
            </p>
          </div>

          <div className="bg-[#0f1623] border border-[#1c2433] rounded-lg p-3">
            <p className="text-xs text-gray-400">Charges</p>
            <p className="text-lg text-yellow-400 font-semibold">{summary.totalCharges.toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* States */}
      {loading && (
        <div className="text-gray-400 text-sm">Loading heatmap...</div>
      )}

      {error && <div className="text-red-400 text-sm mb-4">{error}</div>}

      {/* Empty State */}
      {!loading && !error && heatmap && heatmap.data.length === 0 && (
        <div className="text-gray-500 text-sm">
          No trading activity found for this account.
        </div>
      )}

      {/* Heatmap */}
      {!loading && !error && heatmap && heatmap.data.length > 0 && (
        <div className="bg-[#0f1623] border border-[#1c2433] rounded-xl p-4 shadow-lg">
          <Heatmap data={heatmap.data} />
        </div>
      )}

      <AccountActivity accountId={id}/>
    </div>
  );
}
