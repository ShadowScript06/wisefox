import { useEffect, useState } from "react";
import axios from "axios";

/* ─────────────────────────────────────────
   TYPES
───────────────────────────────────────── */
type Trade = {
  id: string; symbol: string; direction: string;
  quantity: number; price: number; realizedPnl: number;
  createdAt: string; trigger?: string; charges?: number;
};
type Order = {
  id: string; symbol: string; direction: string; status: string;
  type: string; quantity: number; price: number; filledQty: number;
  filledPrice?: number; leverage: number; slPrice?: number;
  tpPrice?: number; isBracket: boolean; createdAt: string; cancelledAt?: string;
};

/* ─────────────────────────────────────────
   GLOBAL CSS
───────────────────────────────────────── */
const CSS = `
  @keyframes slideInRight {
    from { opacity:0; transform:translateX(24px); }
    to   { opacity:1; transform:translateX(0); }
  }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  @keyframes spin   { to{transform:rotate(360deg)} }
  @keyframes shimmer {
    0%   { background-position:-200% 0; }
    100% { background-position:200% 0; }
  }

  .act-row {
    background: #1c1b1b;
    border: 1px solid rgba(255,255,255,0.04);
    border-radius: 10px;
    padding: 12px 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s, transform 0.15s;
    margin-bottom: 6px;
  }
  .act-row:hover {
    border-color: rgba(37,179,23,0.2);
    background: rgba(37,179,23,0.03);
    transform: translateX(2px);
  }
  .act-row:last-child { margin-bottom: 0; }

  .tab-btn {
    font-family: 'Manrope', sans-serif;
    font-size: 11px; font-weight: 700;
    letter-spacing: 0.8px; text-transform: uppercase;
    padding: 8px 16px; border-radius: 7px;
    border: 1px solid transparent; cursor: pointer;
    transition: all 0.2s;
  }
  .tab-btn.active-trades {
    background: rgba(37,179,23,0.1);
    color: #25b317;
    border-color: rgba(37,179,23,0.25);
  }
  .tab-btn.active-orders {
    background: rgba(91,225,70,0.08);
    color: #5be146;
    border-color: rgba(91,225,70,0.2);
  }
  .tab-btn.inactive {
    background: #1c1b1b;
    color: #879580;
    border-color: rgba(255,255,255,0.04);
  }
  .tab-btn:hover.inactive { color: #e5e2e1; border-color: rgba(255,255,255,0.1); }

  .pg-btn {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px; font-weight: 500;
    padding: 7px 14px;
    background: #1c1b1b;
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 7px; color: #879580;
    cursor: pointer; transition: all 0.2s;
  }
  .pg-btn:hover:not(:disabled) { border-color: rgba(37,179,23,0.25); color: #25b317; }
  .pg-btn:disabled { opacity: 0.3; cursor: not-allowed; }

  .drawer-overlay {
    animation: fadeIn 0.2s ease;
  }
  .drawer-panel {
    animation: slideInRight 0.28s cubic-bezier(0.22,1,0.36,1);
  }

  .detail-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 9px 0;
    border-bottom: 1px solid #1c1b1b;
    gap: 12px;
  }
  .detail-row:last-child { border-bottom: none; }

  .skeleton {
    background: linear-gradient(90deg,#1c1b1b 25%,#2a2a2a 50%,#1c1b1b 75%);
    background-size: 200% 100%;
    animation: shimmer 1.6s infinite;
    border-radius: 6px;
  }
`;

/* ─────────────────────────────────────────
   HOOKS
───────────────────────────────────────── */
function useTrades(accountId?: string, page: number = 1) {
  const [data, setData] = useState<Trade[]>([]);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!accountId) return;
    let alive = true;
    async function fetch_() {
      try {
        setLoading(true);
        const res = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/accounts/${accountId}/positions/trades`,
          { params: { page }, withCredentials: true }
        );
        if (!alive) return;
        setData(res.data?.data ?? []);
        setHasNext(res.data?.pagination?.hasNext ?? false);
      } catch { setData([]); }
      finally { if (alive) setLoading(false); }
    }
    fetch_();
    return () => { alive = false; };
  }, [accountId, page]);
  return { data, hasNext, loading };
}

function useOrders(accountId?: string, page: number = 1) {
  const [data, setData] = useState<Order[]>([]);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!accountId) return;
    let alive = true;
    async function fetch_() {
      try {
        setLoading(true);
        const res = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/accounts/${accountId}/orders`,
          { params: { page }, withCredentials: true }
        );
        if (!alive) return;
        setData(res.data?.data ?? []);
        setHasNext(res.data?.pagination?.hasNext ?? false);
      } catch { setData([]); }
      finally { if (alive) setLoading(false); }
    }
    fetch_();
    return () => { alive = false; };
  }, [accountId, page]);
  return { data, hasNext, loading };
}

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
function statusColor(s: string) {
  if (s === "FILLED")    return { bg: "rgba(37,179,23,0.1)",  color: "#25b317", border: "rgba(37,179,23,0.2)" };
  if (s === "PENDING" || s === "OPEN") return { bg: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "rgba(251,191,36,0.2)" };
  if (s === "CANCELLED") return { bg: "rgba(255,255,255,0.05)", color: "#879580", border: "rgba(255,255,255,0.08)" };
  if (s === "EXPIRED")   return { bg: "rgba(251,146,60,0.1)", color: "#fb923c", border: "rgba(251,146,60,0.2)" };
  return { bg: "rgba(91,225,70,0.08)", color: "#5be146", border: "rgba(91,225,70,0.15)" };
}

function Badge({ label, bg, color, border }: { label: string; bg: string; color: string; border: string }) {
  return (
    <span style={{
      fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", fontWeight: 600,
      padding: "3px 7px", borderRadius: "4px",
      background: bg, color, border: `1px solid ${border}`,
      letterSpacing: "0.5px", textTransform: "uppercase" as const,
    }}>{label}</span>
  );
}

function SkeletonRow() {
  return (
    <div style={{ background: "#1c1b1b", border: "1px solid rgba(255,255,255,0.04)", borderRadius: "10px", padding: "12px 14px", marginBottom: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
        <div className="skeleton" style={{ width: "80px", height: "13px", marginBottom: "7px" }} />
        <div className="skeleton" style={{ width: "140px", height: "10px" }} />
      </div>
      <div className="skeleton" style={{ width: "60px", height: "14px" }} />
    </div>
  );
}

function EmptyState({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column" as const, alignItems: "center",
      padding: "36px 20px", gap: "10px",
      border: "1px dashed rgba(37,179,23,0.1)", borderRadius: "10px",
      background: "rgba(37,179,23,0.02)",
    }}>
      <span className="material-symbols-outlined" style={{ fontSize: "26px", color: "rgba(37,179,23,0.25)" }}>{icon}</span>
      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "12px", color: "#879580" }}>{label}</span>
    </div>
  );
}

function DetailRow({ label, value, valueColor }: { label: string; value: React.ReactNode; valueColor?: string }) {
  return (
    <div className="detail-row">
      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: "#879580", letterSpacing: "0.8px", textTransform: "uppercase" as const, flexShrink: 0 }}>{label}</span>
      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "12px", color: valueColor || "#e5e2e1", fontWeight: 600, textAlign: "right" as const }}>{value}</span>
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────── */
export default function AccountActivity({ accountId }: { accountId: string }) {
  const [tab, setTab]     = useState<"trades" | "orders">("trades");
  const [tradePage, setTradePage] = useState(1);
  const [orderPage, setOrderPage] = useState(1);
  const [selected, setSelected]   = useState<Trade | Order | null>(null);

  const { data: trades, hasNext: tradeNext, loading: tradeLoading } = useTrades(accountId, tradePage);
  const { data: orders, hasNext: orderNext, loading: orderLoading } = useOrders(accountId, orderPage);

  const isTrades = tab === "trades";

  return (
    <>
      <style>{CSS}</style>

      <div style={{ marginTop: "8px" }}>

        {/* ── TABS ── */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          <button
            className={`tab-btn${tab === "trades" ? " active-trades" : " inactive"}`}
            onClick={() => setTab("trades")}
          >Trades</button>
          <button
            className={`tab-btn${tab === "orders" ? " active-orders" : " inactive"}`}
            onClick={() => setTab("orders")}
          >Orders</button>

          {/* page indicator */}
          <div style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: "#3e4a39", display: "flex", alignItems: "center" }}>
            Page {isTrades ? tradePage : orderPage}
          </div>
        </div>

        {/* ── LOADING ── */}
        {((isTrades && tradeLoading) || (!isTrades && orderLoading)) && (
          <div>
            {[0,1,2,3].map(i => <SkeletonRow key={i} />)}
          </div>
        )}

        {/* ── EMPTY ── */}
        {isTrades && !tradeLoading && trades.length === 0 && (
          <EmptyState icon="show_chart" label="No trades found" />
        )}
        {!isTrades && !orderLoading && orders.length === 0 && (
          <EmptyState icon="receipt_long" label="No orders found" />
        )}

        {/* ── TRADE LIST ── */}
        {isTrades && !tradeLoading && trades.length > 0 && (
          <div>
            {trades.map((t, i) => {
              const pnlPos = t.realizedPnl >= 0;
              return (
                <div key={t.id} className="act-row" onClick={() => setSelected(t)}
                  style={{ animationDelay: `${i * 0.03}s` }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px" }}>
                      <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: "13px", fontWeight: 700, color: "#e5e2e1" }}>{t.symbol}</span>
                      <Badge
                        label={t.direction}
                        bg={t.direction === "LONG" ? "rgba(37,179,23,0.1)" : "rgba(179,37,23,0.1)"}
                        color={t.direction === "LONG" ? "#25b317" : "#fc8181"}
                        border={t.direction === "LONG" ? "rgba(37,179,23,0.2)" : "rgba(252,129,129,0.2)"}
                      />
                    </div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: "#879580" }}>
                      Qty: {t.quantity.toLocaleString()} · @ ${Number(t.price).toLocaleString()} · {new Date(t.createdAt).toLocaleDateString("en-US", { dateStyle: "short" })}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" as const, flexShrink: 0 }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "14px", fontWeight: 700, color: pnlPos ? "#25b317" : "#fc8181" }}>
                      {pnlPos ? "+" : ""}${Number(t.realizedPnl).toFixed(2)}
                    </div>
                    {t.charges !== undefined && (
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: "#3e4a39", marginTop: "2px" }}>
                        -${Number(t.charges).toFixed(2)} fees
                      </div>
                    )}
                  </div>
                  <span className="material-symbols-outlined" style={{ fontSize: "14px", color: "#3e4a39", flexShrink: 0 }}>chevron_right</span>
                </div>
              );
            })}
          </div>
        )}

        {/* ── ORDER LIST ── */}
        {!isTrades && !orderLoading && orders.length > 0 && (
          <div>
            {orders.map((o, i) => {
              const s = statusColor(o.status);
              return (
                <div key={o.id} className="act-row" onClick={() => setSelected(o)}
                  style={{ animationDelay: `${i * 0.03}s` }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" as const, marginBottom: "5px" }}>
                      <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: "13px", fontWeight: 700, color: "#e5e2e1" }}>{o.symbol}</span>
                      <Badge
                        label={o.direction}
                        bg={o.direction === "LONG" ? "rgba(37,179,23,0.1)" : "rgba(179,37,23,0.1)"}
                        color={o.direction === "LONG" ? "#25b317" : "#fc8181"}
                        border={o.direction === "LONG" ? "rgba(37,179,23,0.2)" : "rgba(252,129,129,0.2)"}
                      />
                      <Badge label={o.type} bg="rgba(91,225,70,0.08)" color="#5be146" border="rgba(91,225,70,0.15)" />
                      <Badge label={o.status} bg={s.bg} color={s.color} border={s.border} />
                    </div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: "#879580" }}>
                      Qty: {o.quantity.toLocaleString()} · Lev: {o.leverage}x · {new Date(o.createdAt).toLocaleDateString("en-US", { dateStyle: "short" })}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" as const, flexShrink: 0 }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "13px", fontWeight: 600, color: "#e5e2e1" }}>
                      ${Number(o.price).toLocaleString()}
                    </div>
                    {o.filledPrice && (
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: "#879580", marginTop: "2px" }}>
                        Filled @ ${Number(o.filledPrice).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <span className="material-symbols-outlined" style={{ fontSize: "14px", color: "#3e4a39", flexShrink: 0 }}>chevron_right</span>
                </div>
              );
            })}
          </div>
        )}

        {/* ── PAGINATION ── */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "16px" }}>
          {isTrades ? (
            <>
              <button className="pg-btn" onClick={() => setTradePage(p => Math.max(1, p - 1))} disabled={tradePage === 1}>← Prev</button>
              <button className="pg-btn" onClick={() => setTradePage(p => p + 1)} disabled={!tradeNext}>Next →</button>
            </>
          ) : (
            <>
              <button className="pg-btn" onClick={() => setOrderPage(p => Math.max(1, p - 1))} disabled={orderPage === 1}>← Prev</button>
              <button className="pg-btn" onClick={() => setOrderPage(p => p + 1)} disabled={!orderNext}>Next →</button>
            </>
          )}
        </div>
      </div>

      {/* ── DETAIL DRAWER ── */}
      {selected && (
        <div className="drawer-overlay" onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }} style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",
        }}>
          <div className="drawer-panel" style={{
            position: "fixed", right: 0, top: 0, bottom: 0, width: "min(440px, 100vw)",
            background: "linear-gradient(180deg,#1a1a1a 0%,#121212 100%)",
            borderLeft: "1px solid rgba(37,179,23,0.12)",
            boxShadow: "-20px 0 60px rgba(0,0,0,0.6), 0 0 40px rgba(37,179,23,0.04)",
            overflowY: "auto", display: "flex", flexDirection: "column" as const,
          }}>
            {/* Drawer header */}
            <div style={{
              padding: "20px 20px 16px",
              borderBottom: "1px solid #1c1b1b",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              position: "sticky", top: 0, background: "#1a1a1a", zIndex: 1,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "#25b317" }}>
                  {"realizedPnl" in selected ? "show_chart" : "receipt_long"}
                </span>
                <div>
                  <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: "15px", fontWeight: 800, color: "#e5e2e1" }}>
                    {"realizedPnl" in selected ? "Trade Details" : "Order Details"}
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: "#879580" }}>
                    {selected.symbol}
                  </div>
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{
                background: "#1c1b1b", border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "7px", width: 30, height: 30, cursor: "pointer",
                color: "#879580", display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "inherit", fontSize: "13px", transition: "all 0.2s",
              }}>✕</button>
            </div>

            {/* Drawer body */}
            <div style={{ padding: "20px" }}>
              {"realizedPnl" in selected ? (
                /* Trade detail */
                <>
                  {/* PnL hero */}
                  <div style={{
                    background: selected.realizedPnl >= 0 ? "rgba(37,179,23,0.06)" : "rgba(179,37,23,0.06)",
                    border: `1px solid ${selected.realizedPnl >= 0 ? "rgba(37,179,23,0.15)" : "rgba(252,129,129,0.15)"}`,
                    borderRadius: "10px", padding: "16px 18px", marginBottom: "16px", textAlign: "center" as const,
                  }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: "#879580", letterSpacing: "1px", marginBottom: "6px" }}>REALIZED PNL</div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "28px", fontWeight: 700, color: selected.realizedPnl >= 0 ? "#25b317" : "#fc8181", letterSpacing: "-0.5px" }}>
                      {selected.realizedPnl >= 0 ? "+" : ""}${Number(selected.realizedPnl).toFixed(2)}
                    </div>
                  </div>
                  <DetailRow label="Symbol" value={selected.symbol} />
                  <DetailRow label="Direction" value={selected.direction}
                    valueColor={selected.direction === "LONG" ? "#25b317" : "#fc8181"} />
                  <DetailRow label="Quantity" value={selected.quantity.toLocaleString()} />
                  <DetailRow label="Price" value={`$${Number(selected.price).toLocaleString()}`} />
                  <DetailRow label="Charges" value={`$${Number(selected.charges ?? 0).toFixed(2)}`} valueColor="#fbbf24" />
                  <DetailRow label="Trigger" value={selected.trigger ?? "—"} />
                  <DetailRow label="Created" value={new Date(selected.createdAt).toLocaleString("en-US")} />
                </>
              ) : (
                /* Order detail */
                <>
                  {/* Status hero */}
                  <div style={{
                    background: statusColor(selected.status).bg,
                    border: `1px solid ${statusColor(selected.status).border}`,
                    borderRadius: "10px", padding: "14px 18px", marginBottom: "16px",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: "#879580", letterSpacing: "1px" }}>STATUS</span>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "14px", fontWeight: 700, color: statusColor(selected.status).color, letterSpacing: "0.5px" }}>
                      {selected.status}
                    </span>
                  </div>
                  <DetailRow label="Symbol" value={selected.symbol} />
                  <DetailRow label="Direction" value={selected.direction}
                    valueColor={selected.direction === "LONG" ? "#25b317" : "#fc8181"} />
                  <DetailRow label="Type" value={selected.type} valueColor="#5be146" />
                  <DetailRow label="Quantity" value={selected.quantity.toLocaleString()} />
                  <DetailRow label="Price" value={`$${Number(selected.price).toLocaleString()}`} />
                  <DetailRow label="Filled Qty" value={selected.filledQty.toLocaleString()} />
                  <DetailRow label="Filled Price" value={selected.filledPrice ? `$${Number(selected.filledPrice).toLocaleString()}` : "—"} />
                  <DetailRow label="Leverage" value={`${selected.leverage}x`} valueColor="#fbbf24" />
                  <DetailRow label="Stop Loss" value={selected.slPrice ? `$${selected.slPrice}` : "—"} valueColor={selected.slPrice ? "#fc8181" : "#3e4a39"} />
                  <DetailRow label="Take Profit" value={selected.tpPrice ? `$${selected.tpPrice}` : "—"} valueColor={selected.tpPrice ? "#25b317" : "#3e4a39"} />
                  <DetailRow label="Bracket" value={selected.isBracket ? "Yes" : "No"} />
                  <DetailRow label="Created" value={new Date(selected.createdAt).toLocaleString("en-US")} />
                  <DetailRow label="Cancelled" value={selected.cancelledAt ? new Date(selected.cancelledAt).toLocaleString("en-US") : "—"} />
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}