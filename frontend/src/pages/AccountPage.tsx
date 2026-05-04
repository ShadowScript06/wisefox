import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import type { RootState } from "../redux/store";
import {
  calculateTrade,
  type TradeResult,
} from "../services/trading/positionSizeCalculator";
import type { PositionStateItem } from "../redux/positionsSlice";

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

interface Position {
  id: string;
  accountId: string;
  symbol: string;
  direction: "LONG" | "SHORT";
  quantity: number;
  avgEntryPrice: number;
  realizedPnl: number;
  isOpen: boolean;
  leverage: number;
  marginUsed: number;
  slPrice: number | null;
  slQty: number | null;
  tpPrice: number | null;
  tpQty: number | null;
  slHit: boolean;
  tpHit: boolean;
  createdAt: string;
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
  const [positions, setPositions] = useState<Position[]>([]);

  const totalPnl = useSelector(
    (state: RootState) => state.positions.totalUnrealizedPnl,
  );

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
      leverage: form.leverage ? Number(form.leverage) : 1,
    });
  }, [
    form.quantity,
    effectiveEntryPrice,
    form.slPrice,
    form.tpPrice,
    form.direction,
    form.leverage,
  ]);

  const sltpValidation = useMemo(() => {
    const entry = effectiveEntryPrice;

    const sl = form.slPrice ? Number(form.slPrice) : null;
    const tp = form.tpPrice ? Number(form.tpPrice) : null;

    const isLong = form.direction === "LONG";

    return {
      slError: sl !== null ? (isLong ? sl >= entry : sl <= entry) : false,

      tpError: tp !== null ? (isLong ? tp <= entry : tp >= entry) : false,
    };
  }, [form.slPrice, form.tpPrice, form.direction, effectiveEntryPrice]);

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
        const [accountRes, ordersRes, positionsRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_BACKEND_URL}/accounts/${id}`, {
            withCredentials: true,
          }),
          axios.get(
            `${import.meta.env.VITE_BACKEND_URL}/accounts/${id}/orders`,
            { withCredentials: true },
          ),
          axios.get(
            `${import.meta.env.VITE_BACKEND_URL}/accounts/${id}/positions`,
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
        if (positionsRes.data.success) {
          setPositions(positionsRes.data.data);
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
  }, [id, showToast, orders]);

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

  async function handleClosePosition(position: Position) {
    if (submitting) return;

    setSubmitting(true);

    try {
      const oppositeDirection =
        position.direction === "LONG" ? "SHORT" : "LONG";

      const closePrice =
        position.symbol === "XAUUSD"
          ? Number(prices["PAXGUSD"])
          : Number(prices["BTCUSD"]);

      const payload = {
        symbol: position.symbol,
        direction: oppositeDirection,
        type: "MARKET",
        quantity: position.quantity,
        price: closePrice, // uses your existing useMemo marketPrice
        ttlSeconds: TTL_MAP["5m"],
        leverage: position.leverage,
      };

      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/accounts/${id}/orders`,
        payload,
        { withCredentials: true },
      );

      if (response.data.success) {
        setOrders((prev) => [response.data.data, ...prev]);
        showToast("Position closed successfully.", "success");
      } else {
        showToast(
          response.data.message ?? "Failed to close position.",
          "error",
        );
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

  async function handleCancelOrder(orderId: string) {
    try {
      const res = await axios.delete(
        `${import.meta.env.VITE_BACKEND_URL}/accounts/${id}/orders/${orderId}`,

        { withCredentials: true },
      );

      if (res.data.success) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId ? { ...o, status: "CANCELLED" } : o,
          ),
        );

        showToast("Order cancelled successfully.", "success");
      } else {
        showToast(res.data.message || "Failed to cancel order.", "error");
      }
    } catch {
      showToast("Failed to cancel order.", "error");
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

  const freeMargin = account.balance;
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
          <div className="flex gap-2">
            <button
              onClick={() => navigate("/dashboard")}
              className="px-3 py-1.5 text-sm rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition"
            >
              ← Dashboard
            </button>
            <button
              onClick={() => navigate(`/accounts/${id}/overview`)}
              className="px-3 py-1.5 text-sm rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black transition"
            >
              Overview
            </button>

            <button
              onClick={() => navigate(`/accounts/${id}/journals`)}
              className="px-3 py-1.5 text-sm rounded-lg bg-purple-500/15 hover:bg-purple-500 text-purple-300 hover:text-black border border-purple-500/20 transition"
            >
              Journals
            </button>

            <button
              onClick={() => navigate(`/accounts/${id}/ai-feedback`)}
              className="px-3 py-1.5 text-sm rounded-lg bg-purple-500/15 hover:bg-purple-500 text-purple-300 hover:text-black border border-purple-500/20 transition"
            >
              AI Feedback
            </button>
          </div>
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
            label="PnL"
            value={`$${totalPnl.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}`}
            color={totalPnl >= 0 ? "green" : "orange"}
          />
        </div>

        {/* Markets + Positions + Orders */}
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

          {/* Positions & Orders Panel */}
          <section>
            {/* Positions */}
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
              Positions
            </h2>

            {positions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-8 text-center mb-5">
                <p className="text-white font-medium text-sm">
                  No Open Positions
                </p>
                <p className="text-zinc-500 text-xs mt-1">
                  Your active trades will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-2 mb-6">
                {positions.map((position) => (
                  <PositionRow
                    key={position.id}
                    position={position}
                    marketPrice={marketPrice}
                    onClose={() => handleClosePosition(position)}
                    showToast={showToast}
                  />
                ))}
              </div>
            )}
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
                  <OrderRow
                    key={order.id}
                    order={order}
                    onCancel={handleCancelOrder}
                  />
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
                  <div className="grid grid-cols-1 gap-2">
                    <input
                      type="number"
                      min="0"
                      value={form.slPrice}
                      onChange={(e) => setField("slPrice", e.target.value)}
                      placeholder="SL Price"
                      className={`px-4 py-3 rounded-xl bg-white/5 border outline-none transition
${
  sltpValidation.slError
    ? "border-red-500 focus:border-red-400"
    : "border-white/10 focus:border-red-400"
}`}
                    />
                    {sltpValidation.slError && (
                      <p className="text-xs text-red-400 mt-1">
                        Invalid SL for {form.direction}. Check entry price.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Take Profit */}
              {form.showTP && (
                <div className="mb-4 rounded-xl border border-green-500/20 bg-green-500/5 p-3">
                  <h3 className="text-sm text-green-400 font-medium mb-3">
                    Take Profit
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    <input
                      type="number"
                      min="0"
                      value={form.tpPrice}
                      onChange={(e) => setField("tpPrice", e.target.value)}
                      placeholder="TP Price"
                      className={`px-4 py-3 rounded-xl bg-white/5 border outline-none transition
${
  sltpValidation.tpError
    ? "border-red-500 focus:border-green-400"
    : "border-white/10 focus:border-green-400"
}`}
                    />
                    {sltpValidation.tpError && (
                      <p className="text-xs text-red-400 mt-1">
                        Invalid TP for {form.direction}. Check entry price.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Trade Preview */}
              {tradeResult &&
                (parseFloat(form.slPrice) > 0 ||
                  parseFloat(form.tpPrice) > 0 ||
                  tradeResult.marginRequired) && (
                  <div className="mb-5 rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-white">
                      Trade Preview
                    </h3>

                    <div className="rounded-xl bg-white/5 p-3 text-sm space-y-2">
                      {tradeResult.marginRequired !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Margin Required</span>
                          <span className="text-yellow-400 font-medium">
                            ${tradeResult.marginRequired.toLocaleString()}
                          </span>
                        </div>
                      )}

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

function OrderRow({
  order,
  onCancel,
}: {
  order: Order;
  onCancel: (id: string) => void;
}) {
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
          {order.status === "PENDING" && (
            <button
              onClick={() => onCancel(order.id)}
              className="mt-2 px-3 py-1 text-xs rounded-lg bg-red-500/15 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 transition"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── SLTP Modal ───────────────────────────────────────────────────────────────

function SLTPModal({
  position,
  onClose,
  onSuccess,
  showToast,
}: {
  position: Position;
  onClose: () => void;
  onSuccess: (updated: Partial<Position>) => void;
  showToast: (msg: string, type: "success" | "error") => void;
}) {
  const [slPrice, setSlPrice] = useState(
    position.slPrice ? String(position.slPrice) : "",
  );
  const [tpPrice, setTpPrice] = useState(
    position.tpPrice ? String(position.tpPrice) : "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [removing, setRemoving] = useState(false);

  const BASE = `${import.meta.env.VITE_BACKEND_URL}/accounts/${position.accountId}/positions/${position.id}/sltp`;

  const hasSL = !!position.slPrice;
  const hasTP = !!position.tpPrice;

  const sltpPreview = useMemo(() => {
    const sl = slPrice ? Number(slPrice) : 0;
    const tp = tpPrice ? Number(tpPrice) : 0;

    if (!position.quantity || !position.avgEntryPrice) return null;

    return calculateTrade({
      contracts: position.quantity,
      entryPrice: position.avgEntryPrice,
      stopLoss: sl,
      target: tp,
      direction: position.direction,
      leverage: position.leverage,
    });
  }, [
    slPrice,
    tpPrice,
    position.quantity,
    position.avgEntryPrice,
    position.direction,
    position.leverage,
  ]);

  // ── Set / update SL+TP ────────────────────────────────────────────────────

  async function handleSave() {
    if (submitting || removing) return;

    if (!slPrice && !tpPrice) {
      showToast("Enter at least one of SL or TP price.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {};
      if (slPrice) payload.slPrice = Number(slPrice);
      if (tpPrice) payload.tpPrice = Number(tpPrice);

      const res = await axios.patch(BASE, payload, { withCredentials: true });

      if (res.data.success) {
        // Merge what we sent into the position so UI reflects it immediately
        onSuccess({
          slPrice: slPrice ? Number(slPrice) : position.slPrice,
          tpPrice: tpPrice ? Number(tpPrice) : position.tpPrice,
          slHit: false,
          tpHit: false,
        });
        showToast("SL/TP updated successfully.", "success");
        onClose();
      } else {
        showToast(res.data.message ?? "Failed to set SL/TP.", "error");
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

  // ── Remove all SL+TP ──────────────────────────────────────────────────────

  async function handleRemoveAll() {
    if (submitting || removing) return;
    setRemoving(true);
    try {
      const res = await axios.delete(BASE, { withCredentials: true });

      if (res.data.success) {
        onSuccess({ slPrice: null, tpPrice: null, slHit: false, tpHit: false });
        showToast("SL/TP removed.", "success");
        onClose();
      } else {
        showToast(res.data.message ?? "Failed to remove SL/TP.", "error");
      }
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data?.message ?? "Network error.")
        : "Unexpected error.";
      showToast(msg, "error");
    } finally {
      setRemoving(false);
    }
  }

  // ── Remove individual leg ─────────────────────────────────────────────────

  async function handleRemoveSL() {
    if (submitting || removing) return;
    setRemoving(true);
    try {
      // Keep existing TP, wipe only SL by patching with just tpPrice
      const payload: Record<string, unknown> = {};
      if (position.tpPrice) payload.tpPrice = position.tpPrice;

      const res = await axios.patch(BASE, payload, { withCredentials: true });

      if (res.data.success) {
        onSuccess({ slPrice: null, slHit: false });
        setSlPrice("");
        showToast("Stop Loss removed.", "success");
      } else {
        showToast(res.data.message ?? "Failed to remove SL.", "error");
      }
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data?.message ?? "Network error.")
        : "Unexpected error.";
      showToast(msg, "error");
    } finally {
      setRemoving(false);
    }
  }

  async function handleRemoveTP() {
    if (submitting || removing) return;
    setRemoving(true);
    try {
      // Keep existing SL, wipe only TP
      const payload: Record<string, unknown> = {};
      if (position.slPrice) payload.slPrice = position.slPrice;

      const res = await axios.patch(BASE, payload, { withCredentials: true });

      if (res.data.success) {
        onSuccess({ tpPrice: null, tpHit: false });
        setTpPrice("");
        showToast("Take Profit removed.", "success");
      } else {
        showToast(res.data.message ?? "Failed to remove TP.", "error");
      }
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data?.message ?? "Network error.")
        : "Unexpected error.";
      showToast(msg, "error");
    } finally {
      setRemoving(false);
    }
  }

  const busy = submitting || removing;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0f1117] text-white shadow-2xl">
        <div className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold tracking-tight">
                Set SL / TP
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                {position.symbol} ·{" "}
                <span
                  className={
                    position.direction === "LONG"
                      ? "text-green-400"
                      : "text-red-400"
                  }
                >
                  {position.direction}
                </span>{" "}
                · Avg ${position.avgEntryPrice.toLocaleString()}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 transition flex items-center justify-center text-zinc-400"
            >
              ✕
            </button>
          </div>

          {/* SL row */}
          <div className="mb-3 rounded-xl border border-red-500/20 bg-red-500/5 p-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-red-400 font-medium">
                Stop Loss Price
              </label>
              {hasSL && (
                <button
                  onClick={handleRemoveSL}
                  disabled={busy}
                  className="text-xs px-2 py-0.5 rounded-md bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/20 transition disabled:opacity-40"
                >
                  {removing ? "Removing…" : "Remove SL"}
                </button>
              )}
            </div>
            <input
              type="number"
              min="0"
              value={slPrice}
              onChange={(e) => setSlPrice(e.target.value)}
              placeholder={
                hasSL ? `Current: $${position.slPrice}` : "No SL set"
              }
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 outline-none focus:border-red-400 transition text-sm placeholder:text-zinc-600"
            />
          </div>

          {/* TP row */}
          <div className="mb-4 rounded-xl border border-green-500/20 bg-green-500/5 p-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-green-400 font-medium">
                Take Profit Price
              </label>
              {hasTP && (
                <button
                  onClick={handleRemoveTP}
                  disabled={busy}
                  className="text-xs px-2 py-0.5 rounded-md bg-green-500/20 hover:bg-green-500/40 text-green-400 border border-green-500/20 transition disabled:opacity-40"
                >
                  {removing ? "Removing…" : "Remove TP"}
                </button>
              )}
            </div>
            <input
              type="number"
              min="0"
              value={tpPrice}
              onChange={(e) => setTpPrice(e.target.value)}
              placeholder={
                hasTP ? `Current: $${position.tpPrice}` : "No TP set"
              }
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 outline-none focus:border-green-400 transition text-sm placeholder:text-zinc-600"
            />
          </div>

          {/* Direction hint */}
          <p className="text-xs text-zinc-600 mb-4">
            {position.direction === "LONG"
              ? "LONG: SL below entry · TP above entry"
              : "SHORT: SL above entry · TP below entry"}
          </p>

          {(slPrice || tpPrice) && sltpPreview && (
            <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white">Risk Preview</h3>

              <div className="space-y-2 text-sm">
                {/* Profit side */}
                {sltpPreview.profit !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Gross Profit (TP)</span>
                    <span className="text-green-400 font-medium">
                      ${sltpPreview.profit.toLocaleString()}
                    </span>
                  </div>
                )}

                {(sltpPreview.profitCharges || sltpPreview.profitGst) && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Profit Fees</span>
                    <span className="text-red-400 font-medium">
                      $
                      {(
                        (sltpPreview.profitCharges ?? 0) +
                        (sltpPreview.profitGst ?? 0)
                      ).toFixed(2)}
                    </span>
                  </div>
                )}

                {sltpPreview.totalProfit !== undefined && (
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-zinc-400">Net Profit</span>
                    <span className="text-green-400 font-semibold">
                      ${sltpPreview.totalProfit.toLocaleString()}
                    </span>
                  </div>
                )}

                {/* Risk side */}
                {sltpPreview.risk !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Gross Loss (SL)</span>
                    <span className="text-red-400 font-medium">
                      ${sltpPreview.risk.toLocaleString()}
                    </span>
                  </div>
                )}

                {(sltpPreview.riskCharges || sltpPreview.riskGst) && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Loss Fees</span>
                    <span className="text-red-400 font-medium">
                      $
                      {(
                        (sltpPreview.riskCharges ?? 0) +
                        (sltpPreview.riskGst ?? 0)
                      ).toFixed(2)}
                    </span>
                  </div>
                )}

                {sltpPreview.totalRisk !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Net Loss</span>
                    <span className="text-red-400 font-semibold">
                      ${sltpPreview.totalRisk.toLocaleString()}
                    </span>
                  </div>
                )}

                {/* Margin hint */}
                {sltpPreview.marginRequired !== undefined && (
                  <div className="flex justify-between pt-2 border-t border-white/10">
                    <span className="text-zinc-400">Margin Impact</span>
                    <span className="text-yellow-400 font-medium">
                      ${sltpPreview.marginRequired.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer actions */}
          <div className="flex gap-2">
            {(hasSL || hasTP) && (
              <button
                onClick={handleRemoveAll}
                disabled={busy}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-white/5 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 border border-white/10 hover:border-red-500/30 transition disabled:opacity-40"
              >
                {removing ? "Removing…" : "Remove All"}
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={busy}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-cyan-500 hover:bg-cyan-400 text-black transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Saving…
                </>
              ) : (
                "Save"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PositionRow (updated) ────────────────────────────────────────────────────

function PositionRow({
  position: initialPosition,
  marketPrice,
  onClose,
  showToast,
}: {
  position: Position;
  marketPrice: number;
  onClose: (id: string) => void;
  showToast: (msg: string, type: "success" | "error") => void;
}) {
  // Own the position state locally so SL/TP updates reflect instantly
  const [position, setPosition] = useState(initialPosition);
  const [showSLTPModal, setShowSLTPModal] = useState(false);

  const livePositions: PositionStateItem[] = useSelector(
    (state: RootState) => state.positions.positions,
  );
  const isLong = position.direction === "LONG";
  const live = livePositions.find((p) => p.positionId === position.id);
  const unrealized = live?.unrealizedPnl ?? 0;
  const pnlPositive = unrealized >= 0;
  const hasSLTP = position.slPrice || position.tpPrice;

  function handleSLTPSuccess(updated: Partial<Position>) {
    setPosition((prev) => ({ ...prev, ...updated }));
  }

  return (
    <>
      {showSLTPModal && (
        <SLTPModal
          position={position}
          onClose={() => setShowSLTPModal(false)}
          onSuccess={handleSLTPSuccess}
          showToast={showToast}
        />
      )}

      <div className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 hover:bg-white/[0.07] transition">
        <div className="flex items-center justify-between">
          {/* LEFT */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white font-semibold text-sm">
                {position.symbol}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                  isLong
                    ? "bg-green-500/15 text-green-400"
                    : "bg-red-500/15 text-red-400"
                }`}
              >
                {position.direction}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-400">
                {position.leverage}x
              </span>
              {!position.isOpen && (
                <span className="text-xs px-2 py-0.5 rounded-md bg-zinc-500/15 text-zinc-400">
                  CLOSED
                </span>
              )}
            </div>

            <p className="text-xs text-zinc-500">
              Qty: {position.quantity.toLocaleString()} · Avg: $
              {position.avgEntryPrice.toLocaleString()}
            </p>

            <p className="text-xs text-zinc-600">
              Margin Used: ${position.marginUsed.toLocaleString()}
            </p>

            {hasSLTP && (
              <p className="text-xs">
                {position.slPrice && (
                  <span className="text-red-400 mr-2">
                    SL ${position.slPrice}
                    {position.slHit ? " ✓" : ""}
                  </span>
                )}
                {position.tpPrice && (
                  <span className="text-green-400">
                    TP ${position.tpPrice}
                    {position.tpHit ? " ✓" : ""}
                  </span>
                )}
              </p>
            )}
          </div>

          {/* RIGHT */}
          <div className="text-right shrink-0 ml-4 space-y-1.5">
            <p className="text-sm font-semibold text-white">
              Mark: ${marketPrice}
            </p>
            <p
              className={`text-sm font-semibold ${pnlPositive ? "text-green-400" : "text-red-400"}`}
            >
              {pnlPositive ? "+" : ""}$
              {unrealized.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </p>
            <p className="text-xs text-zinc-600">
              {new Date(position.createdAt).toLocaleDateString("en-US", {
                dateStyle: "short",
              })}
            </p>

            {position.isOpen && (
              <div className="flex gap-1.5 justify-end flex-wrap">
                <button
                  onClick={() => setShowSLTPModal(true)}
                  className="px-3 py-1 text-xs rounded-lg bg-cyan-500/15 hover:bg-cyan-500 text-cyan-400 hover:text-black border border-cyan-500/20 transition"
                >
                  {hasSLTP ? "Edit SL/TP" : "Set SL/TP"}
                </button>
                <button
                  onClick={() => onClose(position.id)}
                  className="px-3 py-1 text-xs rounded-lg bg-orange-500/15 hover:bg-orange-500 text-orange-400 hover:text-black border border-orange-500/20 transition"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
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

// function PreviewCell({
//   label,
//   value,
//   color,
// }: {
//   label: string;
//   value: string;
//   color?: "green" | "red" | "cyan" | "orange";
// }) {
//   const bg = color
//     ? {
//         green: "bg-green-500/10",
//         red: "bg-red-500/10",
//         cyan: "bg-cyan-500/10",
//         orange: "bg-orange-500/10",
//       }[color]
//     : "bg-white/5";
//   const text = color
//     ? {
//         green: "text-green-400",
//         red: "text-red-400",
//         cyan: "text-cyan-400",
//         orange: "text-orange-400",
//       }[color]
//     : "text-white";
//   const sub = color
//     ? {
//         green: "text-green-300",
//         red: "text-red-300",
//         cyan: "text-cyan-300",
//         orange: "text-orange-300",
//       }[color]
//     : "text-zinc-400";

//   return (
//     <div className={`rounded-xl ${bg} p-3`}>
//       <p className={`${sub} text-xs mb-1`}>{label}</p>
//       <p className={`${text} font-semibold`}>{value}</p>
//     </div>
//   );
// }

// function ChargeRow({ label, value }: { label: string; value: number }) {
//   return (
//     <div className="flex justify-between">
//       <span className="text-zinc-400">{label}</span>
//       <span className="text-white">${value.toFixed(2)}</span>
//     </div>
//   );
// }

export default AccountPage;
