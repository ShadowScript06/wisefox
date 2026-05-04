import { useEffect, useState } from "react";
import axios from "axios";

/* ---------------- TYPES ---------------- */

type Trade = {
  id: string;
  symbol: string;
  direction: string;
  quantity: number;
  price: number;
  realizedPnl: number;
  createdAt: string;
  trigger?: string;
  charges?: number;
};

type Order = {
  id: string;
  symbol: string;
  direction: string;
  status: string;
  type: string;
  quantity: number;
  price: number;
  filledQty: number;
  filledPrice?: number;
  leverage: number;
  slPrice?: number;
  tpPrice?: number;
  isBracket: boolean;
  createdAt: string;
  cancelledAt?: string;
};

/* ---------------- TRADES HOOK ---------------- */

function useTrades(accountId?: string, page: number = 1) {
  const [data, setData] = useState<Trade[]>([]);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!accountId) return;

    let alive = true;

    async function fetchTrades() {
      try {
        setLoading(true);

        const res = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/accounts/${accountId}/positions/trades`,
          { params: { page }, withCredentials: true }
        );

        if (!alive) return;

        setData(res.data?.data ?? []);
        setHasNext(res.data?.pagination?.hasNext ?? false);
      } catch (err) {
        console.error("Trades error:", err);
        setData([]);
      } finally {
        if (alive) setLoading(false);
      }
    }

    fetchTrades();

    return () => {
      alive = false;
    };
  }, [accountId, page]);

  return { data, hasNext, loading };
}

/* ---------------- ORDERS HOOK ---------------- */

function useOrders(accountId?: string, page: number = 1) {
  const [data, setData] = useState<Order[]>([]);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!accountId) return;

    let alive = true;

    async function fetchOrders() {
      try {
        setLoading(true);

        const res = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/accounts/${accountId}/orders`,
          { params: { page, }, withCredentials: true }
        );

        if (!alive) return;

        setData(res.data?.data ?? []);
        setHasNext(res.data?.pagination?.hasNext ?? false);
      } catch (err) {
        console.error("Orders error:", err);
        setData([]);
      } finally {
        if (alive) setLoading(false);
      }
    }

    fetchOrders();

    return () => {
      alive = false;
    };
  }, [accountId, page]);

  return { data, hasNext, loading };
}

/* ---------------- COMPONENT ---------------- */

export default function AccountActivity({
  accountId,
}: {
  accountId: string;
}) {
  const [tab, setTab] = useState<"trades" | "orders">("trades");

  const [tradePage, setTradePage] = useState(1);
  const [orderPage, setOrderPage] = useState(1);

  const { data: trades, hasNext: tradeNext, loading: tradeLoading } =
    useTrades(accountId, tradePage);

  const { data: orders, hasNext: orderNext, loading: orderLoading } =
    useOrders(accountId, orderPage);

  const [selected, setSelected] = useState<Trade | Order | null>(null);

  const isTrades = tab === "trades";

  return (
    <div className="mt-6">

      {/* TOGGLE */}
      <div className="flex gap-3 mb-4">
        {["trades", "orders"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t as any)}
            className={`px-3 py-1 rounded-md text-sm border ${
              tab === t
                ? "bg-white text-black"
                : "border-gray-700 text-gray-300"
            }`}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {/* LOADING */}
      {isTrades && tradeLoading && (
        <p className="text-gray-400">Loading trades...</p>
      )}

      {!isTrades && orderLoading && (
        <p className="text-gray-400">Loading orders...</p>
      )}

      {/* EMPTY STATE */}
      {isTrades && !tradeLoading && trades.length === 0 && (
        <p className="text-gray-500">No trades found</p>
      )}

      {!isTrades && !orderLoading && orders.length === 0 && (
        <p className="text-gray-500">No orders found</p>
      )}

      {/* LIST */}
      <div className="space-y-2 mt-2">

        {/* TRADES */}
        {isTrades &&
          trades.map((t) => (
            <div
              key={t.id}
              onClick={() => setSelected(t)}
              className="bg-[#0f1623] p-3 rounded-md flex justify-between cursor-pointer hover:bg-[#141c2a]"
            >
              <div>
                <p className="font-medium">{t.symbol}</p>
                <p className="text-xs text-gray-400">
                  {t.direction} • Qty {t.quantity} • @ {t.price}
                </p>
              </div>

              <p
                className={
                  t.realizedPnl >= 0 ? "text-green-400" : "text-red-400"
                }
              >
                {t.realizedPnl}
              </p>
            </div>
          ))}

        {/* ORDERS */}
        {!isTrades &&
          orders.map((o) => (
            <div
              key={o.id}
              onClick={() => setSelected(o)}
              className="bg-[#0f1623] p-3 rounded-md flex justify-between cursor-pointer hover:bg-[#141c2a]"
            >
              <div>
                <p className="font-medium">{o.symbol}</p>
                <p className="text-xs text-gray-400">
                  {o.type} • {o.direction} • Qty {o.quantity}
                </p>
              </div>

              <p className="text-gray-300">{o.status}</p>
            </div>
          ))}
      </div>

      {/* PAGINATION */}
      <div className="flex gap-2 mt-4">

        {isTrades ? (
          <>
            <button
              onClick={() => setTradePage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 border border-gray-700 rounded"
            >
              Prev
            </button>

            <button
              disabled={!tradeNext}
              onClick={() => setTradePage((p) => p + 1)}
              className="px-3 py-1 border border-gray-700 rounded disabled:opacity-40"
            >
              Next
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setOrderPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 border border-gray-700 rounded"
            >
              Prev
            </button>

            <button
              disabled={!orderNext}
              onClick={() => setOrderPage((p) => p + 1)}
              className="px-3 py-1 border border-gray-700 rounded disabled:opacity-40"
            >
              Next
            </button>
          </>
        )}
      </div>

      {/* DETAIL PANEL */}
      {selected && (
        <div className="fixed right-0 top-0 w-[420px] h-full bg-[#0f1623] border-l border-[#1c2433] p-5 overflow-y-auto">

          <button
            onClick={() => setSelected(null)}
            className="text-sm text-gray-400 mb-4"
          >
            Close
          </button>

          {"realizedPnl" in selected ? (
            <div className="space-y-2 text-sm">
              <h2 className="text-lg font-semibold mb-3">Trade Details</h2>
              <p>Symbol: {selected.symbol}</p>
              <p>Direction: {selected.direction}</p>
              <p>Quantity: {selected.quantity}</p>
              <p>Price: {selected.price}</p>
              <p className="text-green-400">
                PnL: {selected.realizedPnl}
              </p>
              <p>Charges: {selected.charges ?? 0}</p>
              <p>Trigger: {selected.trigger ?? "-"}</p>
              <p>Created: {selected.createdAt}</p>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <h2 className="text-lg font-semibold mb-3">Order Details</h2>
              <p>Symbol: {selected.symbol}</p>
              <p>Direction: {selected.direction}</p>
              <p>Status: {selected.status}</p>
              <p>Type: {selected.type}</p>
              <p>Quantity: {selected.quantity}</p>
              <p>Price: {selected.price}</p>
              <p>Filled Qty: {selected.filledQty}</p>
              <p>Filled Price: {selected.filledPrice ?? "-"}</p>
              <p>Leverage: {selected.leverage}</p>
              <p>SL: {selected.slPrice ?? "-"}</p>
              <p>TP: {selected.tpPrice ?? "-"}</p>
              <p>Bracket: {selected.isBracket ? "Yes" : "No"}</p>
              <p>Created: {selected.createdAt}</p>
              <p>Cancelled: {selected.cancelledAt ?? "-"}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}