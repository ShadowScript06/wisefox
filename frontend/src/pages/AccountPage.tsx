import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import type { RootState } from "../redux/store";
import {
  calculateTrade,
  type TradeResult,
} from "../services/trading/positionSizeCalculator";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Account {
  balance: number;
  createdAt: string;
  id: string;
  marginUsed: number;
  name: string;
  userId: string;
}

interface Order {
  accountId: string;
  cancelledAt: string | null;
  createdAt: string;
  direction: "SHORT" | "LONG";
  expiresAt: string;
  filledPrice: number | null;
  filledQty: number;
  id: string;
  isBracket: boolean;
  leverage: number;
  price: number;
  quantity: number;
  slPrice: number | null;
  slQty: number | null;
  status: string;
  symbol: string;
  tpPrice: number | null;
  tpQty: number | null;
  type: "MARKET" | "LIMIT";
  updatedAt: string;
}

type Direction = "LONG" | "SHORT";
type OrderType = "MARKET" | "LIMIT";
type SymbolKey = "BTCUSD" | "XAUUSD";

const TTL_MAP: Record<string, number> = {
  "5m": 300,
  "15m": 900,
  "30m": 1800,
  "1h": 3600,
  "2h": 7200,
  "4h": 14400,
  "12h": 43200,
  "24h": 86400, // BUG FIX: was missing from original map
};

const TTL_OPTIONS = Object.keys(TTL_MAP);

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    OPEN: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/25",
    FILLED: "bg-green-500/15 text-green-400 border border-green-500/25",
    CANCELLED: "bg-zinc-500/15 text-zinc-400 border border-zinc-500/25",
    EXPIRED: "bg-orange-500/15 text-orange-400 border border-orange-500/25",
  };
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-md font-medium ${styles[status] ?? "bg-white/10 text-white"}`}
    >
      {status}
    </span>
  );
}

function Toast({
  message,
  type,
}: {
  message: string;
  type: "success" | "error";
}) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-[100] px-4 py-3 rounded-xl text-sm font-medium shadow-xl border animate-slide-up
        ${type === "success" ? "bg-green-500/20 border-green-500/30 text-green-300" : "bg-red-500/20 border-red-500/30 text-red-300"}`}
    >
      {message}
    </div>
  );
}

// ─── Modal form state (isolated) ─────────────────────────────────────────────

const DEFAULT_FORM = {
  direction: "LONG" as Direction,
  orderType: "MARKET" as OrderType,
  quantity: "",
  price: "",
  ttl: "5m",
  leverage: 25,
  showSL: false,
  showTP: false,
  slPrice: "",
  slQty: "",
  tpPrice: "",
  tpQty: "",
};

// ─── Component ────────────────────────────────────────────────────────────────

function AccountPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);

  const [isOpenModal, setIsOpenModal] = useState(false);
  const [symbol, setSymbol] = useState<SymbolKey>("BTCUSD");
  const [form, setForm] = useState(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const prices = useSelector((state: RootState) => state.market);

  // ── Derived market price ────────────────────────────────────────────────────

  const marketPrice = useMemo<number>(() => {
    return symbol === "XAUUSD"
      ? Number(prices["PAXGUSD"])
      : Number(prices[symbol]);
  }, [symbol, prices]);

  // The effective entry price for preview/calc — market order uses live price
  const effectiveEntryPrice = useMemo<number>(() => {
    if (form.orderType === "MARKET") return marketPrice;
    return form.price ? Number(form.price) : 0;
  }, [form.orderType, form.price, marketPrice]);

  // ── Trade preview calculation ───────────────────────────────────────────────
  // BUG FIX: original used `price` state (empty on MARKET orders) — now uses effectiveEntryPrice

  const tradeResult = useMemo<TradeResult | null>(() => {
    if (!form.quantity || !effectiveEntryPrice) return null;
    return calculateTrade({
      contracts: Number(form.quantity),
      entryPrice: effectiveEntryPrice,
      stopLoss: form.slPrice ? Number(form.slPrice) : 0,
      target: form.tpPrice ? Number(form.tpPrice) : 0,
      direction: form.direction,
    });
  }, [
    form.quantity,
    effectiveEntryPrice,
    form.slPrice,
    form.tpPrice,
    form.direction,
  ]);

  // ── Toast helper ────────────────────────────────────────────────────────────

  const showToast = useCallback(
    (message: string, type: "success" | "error") => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      setToast({ message, type });
      toastTimer.current = setTimeout(() => setToast(null), 3500);
    },
    [],
  );

  // ── Data fetching ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    async function fetchAll() {
      try {
        const [accountRes, ordersRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_BACKEND_URL}/accounts/${id}`, {
            withCredentials: true,
          }),
          axios.get(
            `${import.meta.env.VITE_BACKEND_URL}/accounts/${id}/orders`,
            { withCredentials: true },
          ),
        ]);

        if (cancelled) return;

        if (accountRes.data.success) setAccount(accountRes.data.data);
        if (ordersRes.data.success) {
          // Sort newest first
          const sorted = [...ordersRes.data.data].sort(
            (a: Order, b: Order) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
          setOrders(sorted);
        }
      } catch {
        if (!cancelled) showToast("Failed to load account data.", "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAll();
    return () => {
      cancelled = true;
    };
  }, [id, showToast]);

  // ── Modal open/close ────────────────────────────────────────────────────────

  function openModal(sym: SymbolKey, dir: Direction) {
    // BUG FIX: reset all form state on each open so nothing leaks between trades
    setForm({ ...DEFAULT_FORM, direction: dir });
    setSymbol(sym);
    setIsOpenModal(true);
  }

  function closeModal() {
    setIsOpenModal(false);
  }

  // ── Place trade ─────────────────────────────────────────────────────────────

  async function handlePlaceTrade() {
    if (submitting) return;

    if (!form.quantity || Number(form.quantity) <= 0) {
      showToast("Quantity must be greater than 0.", "error");
      return;
    }

    if (
      form.orderType === "LIMIT" &&
      (!form.price || Number(form.price) <= 0)
    ) {
      showToast("Enter a valid limit price.", "error");
      return;
    }

    setSubmitting(true);

    const payload: Record<string, unknown> = {
      symbol,
      direction: form.direction,
      type: form.orderType,
      quantity: Number(form.quantity),
      price: form.orderType === "MARKET" ? marketPrice : Number(form.price),
      ttlSeconds: TTL_MAP[form.ttl],
      leverage: form.leverage,
    };

    // BUG FIX: slPrice/slQty and tpPrice/tpQty were collected but never sent
    if (form.showSL && form.slPrice) {
      payload.slPrice = Number(form.slPrice);
      payload.slQty = form.slQty ? Number(form.slQty) : undefined;
    }

    if (form.showTP && form.tpPrice) {
      payload.tpPrice = Number(form.tpPrice);
      payload.tpQty = form.tpQty ? Number(form.tpQty) : undefined;
    }

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/accounts/${id}/orders`,
        payload,
        { withCredentials: true },
      );

      if (response.data.success) {
        // Insert newest first
        setOrders((prev) => [response.data.data, ...prev]);
        showToast("Trade placed successfully.", "success");
        closeModal();
      } else {
        showToast(response.data.message ?? "Failed to place trade.", "error");
      }
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data?.message ?? "Network error.")
        : "Unexpected error.";
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Field helpers ──────────────────────────────────────────────────────────

  function setField<K extends keyof typeof DEFAULT_FORM>(
    key: K,
    value: (typeof DEFAULT_FORM)[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // ─── Render guards ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center w-full max-w-sm">
          <h1 className="text-white text-lg font-semibold mb-2">
            Account Not Found
          </h1>
          <p className="text-zinc-400 text-sm mb-4">
            This account may have been removed or you don't have access.
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black rounded-lg font-medium transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const freeMargin = account.balance - account.marginUsed;
  const marginUtilPct =
    account.balance > 0
      ? ((account.marginUsed / account.balance) * 100).toFixed(1)
      : "0.0";

  // ─── JSX ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* Top Bar */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0a0a0f]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-5 py-3">
          <div>
            <h1 className="text-base font-semibold tracking-tight">
              {account.name}
            </h1>
            <p className="text-xs text-zinc-500">
              Trading Account ·{" "}
              {new Date(account.createdAt).toLocaleDateString("en-US", {
                dateStyle: "medium",
              })}
            </p>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-3 py-1.5 text-sm rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition"
          >
            ← Dashboard
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Account Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Balance"
            value={`$${account.balance.toLocaleString()}`}
            color="cyan"
          />
          <StatCard
            label="Margin Used"
            value={`$${account.marginUsed.toLocaleString()}`}
            sub={`${marginUtilPct}% of balance`}
            color="orange"
          />
          <StatCard
            label="Free Margin"
            value={`$${freeMargin.toLocaleString()}`}
            color="green"
          />
          <StatCard
            label="Open Orders"
            value={String(orders.filter((o) => o.status === "OPEN").length)}
            sub={`${orders.length} total`}
            color="purple"
          />
        </div>

        {/* Markets + Orders */}
        <div className="grid md:grid-cols-[320px_1fr] gap-6">
          {/* Markets Panel */}
          <aside className="space-y-3">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
              Markets
            </h2>

            <MarketRow
              symbol="BTCUSD"
              name="Bitcoin / USD"
              price={prices.BTCUSD}
              onBuy={() => openModal("BTCUSD", "LONG")}
              onSell={() => openModal("BTCUSD", "SHORT")}
            />

            <MarketRow
              symbol="XAUUSD"
              name="Gold / USD"
              price={prices.PAXGUSD}
              onBuy={() => openModal("XAUUSD", "LONG")}
              onSell={() => openModal("XAUUSD", "SHORT")}
            />
          </aside>

          {/* Orders Panel */}
          <section>
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
              Orders
            </h2>

            {orders.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-12 text-center">
                <p className="text-white font-medium text-sm">No Orders Yet</p>
                <p className="text-zinc-500 text-xs mt-1">
                  Place your first trade above.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {orders.map((order) => (
                  <OrderRow key={order.id} order={order} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Trade Modal */}
      {isOpenModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md px-4"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f1117] text-white shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-hide">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-xl font-semibold tracking-tight">
                    {symbol}
                  </h1>
                  <p className="text-xs text-zinc-400">
                    Market:{" "}
                    <span className="text-cyan-400 font-medium">
                      ${marketPrice.toLocaleString()}
                    </span>
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  aria-label="Close modal"
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 transition flex items-center justify-center text-zinc-400"
                >
                  ✕
                </button>
              </div>

              {/* Direction */}
              <ModalSection label="Direction">
                <ToggleGroup
                  options={[
                    {
                      value: "LONG",
                      label: "LONG",
                      active: "bg-green-500 text-black",
                    },
                    {
                      value: "SHORT",
                      label: "SHORT",
                      active: "bg-red-500 text-white",
                    },
                  ]}
                  value={form.direction}
                  onChange={(v) => setField("direction", v as Direction)}
                />
              </ModalSection>

              {/* Order Type */}
              <ModalSection label="Order Type">
                <ToggleGroup
                  options={[
                    {
                      value: "MARKET",
                      label: "MARKET",
                      active: "bg-cyan-500 text-black",
                    },
                    {
                      value: "LIMIT",
                      label: "LIMIT",
                      active: "bg-cyan-500 text-black",
                    },
                  ]}
                  value={form.orderType}
                  onChange={(v) => setField("orderType", v as OrderType)}
                />
              </ModalSection>

              {/* Quantity */}
              <ModalSection label="Quantity (Contracts)">
                <input
                  id="qty"
                  type="number"
                  min="1"
                  value={form.quantity}
                  onChange={(e) => setField("quantity", e.target.value)}
                  placeholder="e.g. 1000 contracts = 1 lot"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 outline-none focus:border-cyan-400 transition placeholder:text-zinc-600"
                />
              </ModalSection>

              {/* Price — hidden for MARKET (but shows live price read-only) */}
              <ModalSection
                label={
                  form.orderType === "MARKET"
                    ? "Entry Price (live)"
                    : "Limit Price"
                }
              >
                <input
                  id="price"
                  type="number"
                  min="0"
                  readOnly={form.orderType === "MARKET"}
                  value={form.orderType === "MARKET" ? marketPrice : form.price}
                  onChange={(e) => setField("price", e.target.value)}
                  placeholder="Enter limit price"
                  className={`w-full px-4 py-3 rounded-xl border outline-none transition
                    ${
                      form.orderType === "MARKET"
                        ? "bg-white/[0.03] border-white/5 text-zinc-400 cursor-not-allowed"
                        : "bg-white/5 border-white/10 focus:border-cyan-400"
                    }`}
                />
              </ModalSection>

              {/* SL / TP Toggles */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <button
                  onClick={() => setField("showSL", !form.showSL)}
                  className={`py-2 rounded-xl font-medium text-sm transition ${
                    form.showSL
                      ? "bg-red-500 text-white"
                      : "bg-white/5 hover:bg-white/10 text-zinc-300"
                  }`}
                >
                  {form.showSL ? "Remove Stop Loss" : "Add Stop Loss"}
                </button>
                <button
                  onClick={() => setField("showTP", !form.showTP)}
                  className={`py-2 rounded-xl font-medium text-sm transition ${
                    form.showTP
                      ? "bg-green-500 text-black"
                      : "bg-white/5 hover:bg-white/10 text-zinc-300"
                  }`}
                >
                  {form.showTP ? "Remove Take Profit" : "Add Take Profit"}
                </button>
              </div>

              {/* Stop Loss */}
              {form.showSL && (
                <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/5 p-3">
                  <h3 className="text-sm text-red-400 font-medium mb-3">
                    Stop Loss
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min="0"
                      value={form.slPrice}
                      onChange={(e) => setField("slPrice", e.target.value)}
                      placeholder="SL Price"
                      className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 outline-none focus:border-red-400 transition"
                    />
                    <input
                      type="number"
                      min="0"
                      value={form.slQty}
                      onChange={(e) => setField("slQty", e.target.value)}
                      placeholder="SL Qty (optional)"
                      className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 outline-none focus:border-red-400 transition"
                    />
                  </div>
                </div>
              )}

              {/* Take Profit */}
              {form.showTP && (
                <div className="mb-4 rounded-xl border border-green-500/20 bg-green-500/5 p-3">
                  <h3 className="text-sm text-green-400 font-medium mb-3">
                    Take Profit
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min="0"
                      value={form.tpPrice}
                      onChange={(e) => setField("tpPrice", e.target.value)}
                      placeholder="TP Price"
                      className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 outline-none focus:border-green-400 transition"
                    />
                    <input
                      type="number"
                      min="0"
                      value={form.tpQty}
                      onChange={(e) => setField("tpQty", e.target.value)}
                      placeholder="TP Qty (optional)"
                      className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 outline-none focus:border-green-400 transition"
                    />
                  </div>
                </div>
              )}

              {/* Trade Preview */}
              {tradeResult &&
                (parseFloat(form.slPrice) > 0 || parseFloat(form.tpPrice)) && (
                  <div className="mb-5 rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-white">
                      Trade Preview
                    </h3>

                    <div className="rounded-xl bg-white/5 p-3 text-sm space-y-2">
                      {/* Profit Side */}
                      {tradeResult.profit !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Gross Profit</span>
                          <span className="text-green-400 font-medium">
                            ${tradeResult.profit.toLocaleString()}
                          </span>
                        </div>
                      )}

                      {(tradeResult.profitCharges !== undefined ||
                        tradeResult.profitGst !== undefined) && (
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Profit Charges</span>
                          <span className="text-red-400 font-medium">
                            $
                            {(
                              (tradeResult.profitCharges ?? 0) +
                              (tradeResult.profitGst ?? 0)
                            ).toFixed(2)}
                          </span>
                        </div>
                      )}

                      {tradeResult.totalProfit !== undefined && (
                        <div className="flex justify-between border-b border-white/10 pb-2 mb-2">
                          <span className="text-zinc-400">Net Profit</span>
                          <span className="text-green-400 font-medium">
                            ${tradeResult.totalProfit.toLocaleString()}
                          </span>
                        </div>
                      )}

                      {/* Risk Side */}
                      {tradeResult.risk !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Gross Loss</span>
                          <span className="text-red-400 font-medium">
                            ${tradeResult.risk.toLocaleString()}
                          </span>
                        </div>
                      )}

                      {(tradeResult.riskCharges !== undefined ||
                        tradeResult.riskGst !== undefined) && (
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Loss Charges</span>
                          <span className="text-red-400 font-medium">
                            $
                            {(
                              (tradeResult.riskCharges ?? 0) +
                              (tradeResult.riskGst ?? 0)
                            ).toFixed(2)}
                          </span>
                        </div>
                      )}

                      {tradeResult.totalRisk !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Net Loss</span>
                          <span className="text-red-400 font-medium">
                            ${tradeResult.totalRisk.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              {/* TTL */}
              <ModalSection label="Time To Live">
                <div className="grid grid-cols-4 gap-2 text-sm">
                  {TTL_OPTIONS.map((item) => (
                    <button
                      key={item}
                      onClick={() => setField("ttl", item)}
                      className={`py-2 rounded-lg transition ${
                        form.ttl === item
                          ? "bg-cyan-500 text-black font-semibold"
                          : "bg-white/5 hover:bg-white/10 text-zinc-300"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </ModalSection>

              {/* Leverage */}
              <div className="mb-6">
                <div className="flex justify-between mb-2">
                  <label className="text-sm text-zinc-400">Leverage</label>
                  <span className="text-cyan-400 font-semibold">
                    {form.leverage}x
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="200"
                  value={form.leverage}
                  onChange={(e) => setField("leverage", Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
                <div className="flex justify-between text-xs text-zinc-600 mt-1">
                  <span>1x</span>
                  <span>200x</span>
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={handlePlaceTrade}
                disabled={submitting}
                className={`w-full py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2
                  ${
                    form.direction === "LONG"
                      ? "bg-green-500 hover:bg-green-400 text-black"
                      : "bg-red-500 hover:bg-red-400 text-white"
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    Placing…
                  </>
                ) : (
                  `Place ${form.direction} Trade`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animation keyframes (injected once) */}
      <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up { animation: slide-up 0.25s ease; }
      `}</style>
    </div>
  );
}

// ─── Small presentational helpers ────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color: "cyan" | "orange" | "green" | "purple";
}) {
  const textColor = {
    cyan: "text-cyan-400",
    orange: "text-orange-400",
    green: "text-green-400",
    purple: "text-purple-400",
  }[color];

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <h2 className={`text-xl font-bold ${textColor}`}>{value}</h2>
      {sub && <p className="text-xs text-zinc-600 mt-0.5">{sub}</p>}
    </div>
  );
}

function MarketRow({
  symbol,
  name,
  price,
  onBuy,
  onSell,
}: {
  symbol: string;
  name: string;
  price: string | number;
  onBuy: () => void;
  onSell: () => void;
}) {
  return (
    <div className="w-full border border-white/10 bg-white/5 rounded-xl px-4 py-3 flex items-center justify-between hover:bg-white/[0.07] transition">
      <div>
        <h3 className="text-white font-semibold text-sm tracking-wide">
          {symbol}
        </h3>
        <p className="text-zinc-500 text-xs">{name}</p>
      </div>
      <span className="text-cyan-400 font-bold text-base">
        ${Number(price).toLocaleString()}
      </span>
      <div className="flex gap-2">
        <button
          onClick={onBuy}
          className="px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-400 text-black text-xs font-semibold transition"
        >
          Buy
        </button>
        <button
          onClick={onSell}
          className="px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-400 text-white text-xs font-semibold transition"
        >
          Sell
        </button>
      </div>
    </div>
  );
}

function OrderRow({ order }: { order: Order }) {
  return (
    <div className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 hover:bg-white/[0.07] transition">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-semibold text-sm">
              {order.symbol}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                order.direction === "LONG"
                  ? "bg-green-500/15 text-green-400"
                  : "bg-red-500/15 text-red-400"
              }`}
            >
              {order.direction}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-400">
              {order.type}
            </span>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-xs text-zinc-500">
            Qty: {order.quantity.toLocaleString()} · Lev: {order.leverage}x
            {order.slPrice && ` · SL: $${order.slPrice}`}
            {order.tpPrice && ` · TP: $${order.tpPrice}`}
          </p>
        </div>
        <div className="text-right shrink-0 ml-4">
          <p className="text-sm font-semibold text-white">
            ${Number(order.price).toLocaleString()}
          </p>
          {order.filledPrice && (
            <p className="text-xs text-zinc-500">
              Filled @ ${Number(order.filledPrice).toLocaleString()}
            </p>
          )}
          <p className="text-xs text-zinc-600 mt-0.5">
            {new Date(order.createdAt).toLocaleDateString("en-US", {
              dateStyle: "short",
            })}
          </p>
        </div>
      </div>
    </div>
  );
}

function ModalSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <label className="text-sm text-zinc-400 block mb-2">{label}</label>
      {children}
    </div>
  );
}

function ToggleGroup({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string; active: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`py-2 rounded-xl font-semibold transition ${
            value === opt.value
              ? opt.active
              : "bg-white/5 hover:bg-white/10 text-zinc-300"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function PreviewCell({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: "green" | "red" | "cyan" | "orange";
}) {
  const bg = color
    ? {
        green: "bg-green-500/10",
        red: "bg-red-500/10",
        cyan: "bg-cyan-500/10",
        orange: "bg-orange-500/10",
      }[color]
    : "bg-white/5";
  const text = color
    ? {
        green: "text-green-400",
        red: "text-red-400",
        cyan: "text-cyan-400",
        orange: "text-orange-400",
      }[color]
    : "text-white";
  const sub = color
    ? {
        green: "text-green-300",
        red: "text-red-300",
        cyan: "text-cyan-300",
        orange: "text-orange-300",
      }[color]
    : "text-zinc-400";

  return (
    <div className={`rounded-xl ${bg} p-3`}>
      <p className={`${sub} text-xs mb-1`}>{label}</p>
      <p className={`${text} font-semibold`}>{value}</p>
    </div>
  );
}

function ChargeRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-zinc-400">{label}</span>
      <span className="text-white">${value.toFixed(2)}</span>
    </div>
  );
}

export default AccountPage;
