import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import type { RootState } from "../redux/store";
import { calculateTrade, type TradeResult } from "../services/trading/positionSizeCalculator";
import type { PositionStateItem } from "../redux/positionsSlice";

// ─── Types ─────────────────────────────────────────────────────────────────

interface Account {
  balance: number; createdAt: string; id: string;
  marginUsed: number; name: string; userId: string;
}
interface Order {
  accountId: string; cancelledAt: string | null; createdAt: string;
  direction: "SHORT" | "LONG"; expiresAt: string;
  filledPrice: number | null; filledQty: number; id: string;
  isBracket: boolean; leverage: number; price: number;
  quantity: number; slPrice: number | null; slQty: number | null;
  status: string; symbol: string; tpPrice: number | null;
  tpQty: number | null; type: "MARKET" | "LIMIT"; updatedAt: string;
}
interface Position {
  id: string; accountId: string; symbol: string;
  direction: "LONG" | "SHORT"; quantity: number;
  avgEntryPrice: number; realizedPnl: number; isOpen: boolean;
  leverage: number; marginUsed: number;
  slPrice: number | null; slQty: number | null;
  tpPrice: number | null; tpQty: number | null;
  slHit: boolean; tpHit: boolean;
  createdAt: string; updatedAt: string;
}
type Direction = "LONG" | "SHORT";
type OrderType = "MARKET" | "LIMIT";
type SymbolKey = "BTCUSD" | "XAUUSD";

const TTL_MAP: Record<string, number> = {
  "5m": 300, "15m": 900, "30m": 1800, "1h": 3600,
  "2h": 7200, "4h": 14400, "12h": 43200, "24h": 86400,
};
const TTL_OPTIONS = Object.keys(TTL_MAP);

const DEFAULT_FORM = {
  direction: "LONG" as Direction,
  orderType: "MARKET" as OrderType,
  quantity: "", price: "", ttl: "5m", leverage: 25,
  showSL: false, showTP: false,
  slPrice: "", slQty: "", tpPrice: "", tpQty: "",
};

// ─── Global CSS ─────────────────────────────────────────────────────────────

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@300;400;500;600&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { -webkit-font-smoothing: antialiased; background: #050505; }

  .material-symbols-outlined {
    font-family: 'Material Symbols Outlined';
    font-variation-settings: 'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24;
    font-style: normal; line-height: 1; letter-spacing: normal;
    text-transform: none; white-space: nowrap; word-wrap: normal;
    direction: ltr; -webkit-font-smoothing: antialiased; user-select: none;
  }

  @keyframes fadeUp {
    from { opacity:0; transform:translateY(14px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  @keyframes spin { to{transform:rotate(360deg)} }
  @keyframes slideUp {
    from { opacity:0; transform:translateY(10px) scale(0.98); }
    to   { opacity:1; transform:translateY(0) scale(1); }
  }
  @keyframes modalIn {
    from { opacity:0; transform:scale(0.94) translateY(12px); }
    to   { opacity:1; transform:scale(1) translateY(0); }
  }
  @keyframes toastIn {
    from { opacity:0; transform:translateY(10px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes shimmer {
    0% { background-position:-200% 0; }
    100% { background-position:200% 0; }
  }
  @keyframes pricePulse {
    0%,100% { color:#e5e2e1; }
    50%      { color:#5be146; }
  }

  .anim-fade-up   { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both; }
  .anim-fade-in   { animation: fadeIn 0.3s ease both; }
  .anim-modal-in  { animation: modalIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both; }
  .anim-toast     { animation: toastIn 0.25s ease both; }

  .card-hover {
    transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
  }
  .card-hover:hover {
    border-color: rgba(37,179,23,0.2) !important;
    transform: translateY(-1px);
    box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(37,179,23,0.04);
  }

  .row-hover { transition: border-color 0.2s, background 0.2s; }
  .row-hover:hover {
    border-color: rgba(37,179,23,0.18) !important;
    background: rgba(37,179,23,0.03) !important;
  }

  .ee-input {
    width:100%;
    font-family:'JetBrains Mono',monospace;
    font-size:13px;
    padding:11px 14px;
    background:#1c1b1b;
    border:1px solid rgba(255,255,255,0.06);
    border-radius:8px;
    color:#e5e2e1;
    outline:none;
    box-sizing:border-box;
    transition:border-color 0.2s, box-shadow 0.2s;
  }
  .ee-input::placeholder { color:#3e4a39; }
  .ee-input:focus {
    border-color:rgba(37,179,23,0.5);
    box-shadow:0 0 0 3px rgba(37,179,23,0.08);
  }
  .ee-input:read-only {
    background:#161616;
    color:#879580;
    cursor:not-allowed;
  }
  .ee-input.sl-focus:focus { border-color:rgba(252,129,129,0.5); box-shadow:0 0 0 3px rgba(252,129,129,0.06); }
  .ee-input.tp-focus:focus { border-color:rgba(37,179,23,0.5); }

  .btn-long {
    background: #25b317; color:#023a00;
    border:none; border-radius:9px;
    font-family:'Manrope',sans-serif;
    font-size:12px; font-weight:800;
    letter-spacing:0.8px; text-transform:uppercase;
    cursor:pointer; padding:8px 16px;
    transition:background 0.2s, box-shadow 0.2s, transform 0.15s;
  }
  .btn-long:hover { background:#5be146; box-shadow:0 0 16px rgba(37,179,23,0.35); transform:translateY(-1px); }

  .btn-short {
    background: rgba(179,37,23,0.15); color:#fc8181;
    border:1px solid rgba(252,129,129,0.2); border-radius:9px;
    font-family:'Manrope',sans-serif;
    font-size:12px; font-weight:800;
    letter-spacing:0.8px; text-transform:uppercase;
    cursor:pointer; padding:8px 16px;
    transition:background 0.2s, box-shadow 0.2s, transform 0.15s;
  }
  .btn-short:hover { background:rgba(252,129,129,0.2); box-shadow:0 0 16px rgba(252,129,129,0.2); transform:translateY(-1px); }

  .btn-ghost {
    background: #1c1b1b;
    border:1px solid rgba(255,255,255,0.06); border-radius:8px;
    color:#bdcbb4;
    font-family:'Manrope',sans-serif;
    font-size:11px; font-weight:600;
    cursor:pointer; padding:7px 14px;
    transition:border-color 0.2s, background 0.2s, color 0.2s;
  }
  .btn-ghost:hover { border-color:rgba(37,179,23,0.25); color:#e5e2e1; }

  .toggle-btn {
    flex:1; padding:9px;
    background:#1c1b1b; border:1px solid rgba(255,255,255,0.06);
    border-radius:8px; color:#879580;
    font-family:'Manrope',sans-serif; font-size:11px; font-weight:700;
    letter-spacing:0.8px; text-transform:uppercase;
    cursor:pointer; transition:all 0.2s;
  }
  .toggle-btn.active-long { background:#25b317; color:#023a00; border-color:#25b317; box-shadow:0 0 12px rgba(37,179,23,0.3); }
  .toggle-btn.active-short { background:rgba(252,129,129,0.15); color:#fc8181; border-color:rgba(252,129,129,0.3); }
  .toggle-btn.active-market { background:rgba(91,225,70,0.1); color:#5be146; border-color:rgba(91,225,70,0.25); }
  .toggle-btn.active-limit  { background:rgba(251,191,36,0.1); color:#fbbf24; border-color:rgba(251,191,36,0.25); }

  .ttl-btn {
    padding:8px; background:#1c1b1b;
    border:1px solid rgba(255,255,255,0.05);
    border-radius:7px; color:#879580;
    font-family:'JetBrains Mono',monospace; font-size:11px; font-weight:500;
    cursor:pointer; transition:all 0.2s; text-align:center;
  }
  .ttl-btn.active { background:rgba(37,179,23,0.12); color:#25b317; border-color:rgba(37,179,23,0.3); }

  .range-green { accent-color:#25b317; }

  ::-webkit-scrollbar { width:3px; height:3px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:#1c1b1b; border-radius:4px; }

  @media (max-width:768px) {
    .main-grid-account { grid-template-columns:1fr !important; }
    .stat-grid { grid-template-columns:1fr 1fr !important; }
  }
`;

// ─── Toast ─────────────────────────────────────────────────────────────────

function Toast({ message, type }: { message: string; type: "success" | "error" }) {
  const isSuccess = type === "success";
  return (
    <div className="anim-toast" style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 200,
      display: "flex", alignItems: "center", gap: "10px",
      padding: "12px 18px",
      background: isSuccess ? "rgba(37,179,23,0.1)" : "rgba(179,37,23,0.1)",
      border: `1px solid ${isSuccess ? "rgba(37,179,23,0.25)" : "rgba(252,129,129,0.25)"}`,
      borderRadius: "10px",
      boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 20px ${isSuccess ? "rgba(37,179,23,0.08)" : "rgba(252,129,129,0.08)"}`,
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: "12px",
      color: isSuccess ? "#5be146" : "#fc8181",
      backdropFilter: "blur(12px)",
    }}>
      <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>
        {isSuccess ? "check_circle" : "error"}
      </span>
      {message}
    </div>
  );
}

// ─── Badge ─────────────────────────────────────────────────────────────────

function EEBadge({ children, variant }: {
  children: React.ReactNode;
  variant: "green" | "red" | "yellow" | "blue" | "gray" | "orange";
}) {
  const map = {
    green:  { bg: "rgba(37,179,23,0.1)",  color: "#25b317", border: "rgba(37,179,23,0.2)" },
    red:    { bg: "rgba(179,37,23,0.1)",  color: "#fc8181", border: "rgba(252,129,129,0.2)" },
    yellow: { bg: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "rgba(251,191,36,0.2)" },
    blue:   { bg: "rgba(91,225,70,0.08)", color: "#5be146", border: "rgba(91,225,70,0.2)" },
    gray:   { bg: "rgba(255,255,255,0.05)", color: "#879580", border: "rgba(255,255,255,0.08)" },
    orange: { bg: "rgba(251,146,60,0.1)", color: "#fb923c", border: "rgba(251,146,60,0.2)" },
  };
  const s = map[variant];
  return (
    <span style={{
      fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", fontWeight: 600,
      padding: "3px 8px", borderRadius: "4px",
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      letterSpacing: "0.5px", textTransform: "uppercase" as const,
    }}>{children}</span>
  );
}

function statusVariant(status: string): "green" | "yellow" | "gray" | "orange" | "red" | "blue" {
  if (status === "FILLED") return "green";
  if (status === "OPEN" || status === "PENDING") return "yellow";
  if (status === "CANCELLED") return "gray";
  if (status === "EXPIRED") return "orange";
  return "blue";
}

// ─── Stat Card ─────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color, icon, delay }: {
  label: string; value: string; sub?: string;
  color: "green" | "red" | "yellow" | "blue"; icon: string; delay?: string;
}) {
  const c = {
    green:  "#25b317", red: "#fc8181", yellow: "#fbbf24", blue: "#5be146",
  }[color];
  return (
    <div className="anim-fade-up card-hover" style={{
      animationDelay: delay || "0s",
      background: "linear-gradient(180deg,#121212 0%,#0e0e0e 100%)",
      border: "1px solid rgba(37,179,23,0.08)",
      borderRadius: "12px", padding: "18px 20px",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: -20, right: -20, width: 70, height: 70, borderRadius: "50%", background: c, opacity: 0.05, pointerEvents: "none" }} />
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
        <span className="material-symbols-outlined" style={{ fontSize: "14px", color: c }}>{icon}</span>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: "#879580", letterSpacing: "1px", textTransform: "uppercase" as const }}>{label}</span>
      </div>
      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "22px", fontWeight: 600, color: c, letterSpacing: "-0.5px" }}>{value}</div>
      {sub && <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: "#3e4a39", marginTop: "4px" }}>{sub}</div>}
    </div>
  );
}

// ─── Market Row ─────────────────────────────────────────────────────────────

function MarketRow({ symbol, name, price, accent, onBuy, onSell }: {
  symbol: string; name: string; price: number; accent: string;
  onBuy: () => void; onSell: () => void;
}) {
  return (
    <div className="row-hover" style={{
      background: "linear-gradient(180deg,#121212 0%,#0e0e0e 100%)",
      border: "1px solid rgba(37,179,23,0.08)",
      borderRadius: "10px", padding: "14px 16px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: "10px",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "3px" }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: accent, flexShrink: 0 }} />
          <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: "13px", fontWeight: 700, color: "#e5e2e1" }}>{symbol}</span>
        </div>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: "#879580" }}>{name}</div>
      </div>
      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "15px", fontWeight: 600, color: "#5be146", letterSpacing: "-0.5px", flexShrink: 0 }}>
        ${Number(price).toLocaleString()}
      </div>
      <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
        <button className="btn-long" onClick={onBuy} style={{ padding: "7px 12px", fontSize: "11px" }}>Buy</button>
        <button className="btn-short" onClick={onSell} style={{ padding: "7px 12px", fontSize: "11px" }}>Sell</button>
      </div>
    </div>
  );
}

// ─── Order Row ─────────────────────────────────────────────────────────────

function OrderRow({ order, onCancel }: { order: Order; onCancel: (id: string) => void }) {
  const isLong = order.direction === "LONG";
  return (
    <div className="row-hover anim-fade-up" style={{
      background: "linear-gradient(180deg,#121212 0%,#0e0e0e 100%)",
      border: "1px solid rgba(37,179,23,0.06)",
      borderRadius: "10px", padding: "14px 16px",
      display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" as const, marginBottom: "6px" }}>
          <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: "13px", fontWeight: 700, color: "#e5e2e1" }}>{order.symbol}</span>
          <EEBadge variant={isLong ? "green" : "red"}>{order.direction}</EEBadge>
          <EEBadge variant={order.type === "MARKET" ? "blue" : "yellow"}>{order.type}</EEBadge>
          <EEBadge variant={statusVariant(order.status)}>{order.status}</EEBadge>
        </div>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", color: "#879580" }}>
          Qty: {order.quantity.toLocaleString()} · Lev: {order.leverage}x
          {order.slPrice ? ` · SL: $${order.slPrice}` : ""}
          {order.tpPrice ? ` · TP: $${order.tpPrice}` : ""}
        </div>
      </div>
      <div style={{ textAlign: "right" as const, flexShrink: 0 }}>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "13px", fontWeight: 600, color: "#e5e2e1", marginBottom: "3px" }}>
          ${Number(order.price).toLocaleString()}
        </div>
        {order.filledPrice && (
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: "#879580", marginBottom: "3px" }}>
            Filled @ ${Number(order.filledPrice).toLocaleString()}
          </div>
        )}
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: "#3e4a39", marginBottom: "6px" }}>
          {new Date(order.createdAt).toLocaleDateString("en-US", { dateStyle: "short" })}
        </div>
        {order.status === "PENDING" && (
          <button onClick={() => onCancel(order.id)} style={{
            padding: "5px 10px", background: "rgba(179,37,23,0.08)",
            border: "1px solid rgba(252,129,129,0.2)", borderRadius: "6px",
            color: "#fc8181", fontFamily: "'Manrope',sans-serif",
            fontSize: "10px", fontWeight: 700, cursor: "pointer",
            letterSpacing: "0.5px", transition: "all 0.2s",
          }}>Cancel</button>
        )}
      </div>
    </div>
  );
}

// ─── SLTP Modal ─────────────────────────────────────────────────────────────

function SLTPModal({ position, onClose, onSuccess, showToast }: {
  position: Position; onClose: () => void;
  onSuccess: (updated: Partial<Position>) => void;
  showToast: (msg: string, type: "success" | "error") => void;
}) {
  const [slPrice, setSlPrice] = useState(position.slPrice ? String(position.slPrice) : "");
  const [tpPrice, setTpPrice] = useState(position.tpPrice ? String(position.tpPrice) : "");
  const [submitting, setSubmitting] = useState(false);
  const [removing, setRemoving] = useState(false);

  const BASE = `${import.meta.env.VITE_BACKEND_URL}/accounts/${position.accountId}/positions/${position.id}/sltp`;
  const hasSL = !!position.slPrice;
  const hasTP = !!position.tpPrice;
  const busy = submitting || removing;

  const sltpPreview = useMemo(() => {
    const sl = slPrice ? Number(slPrice) : 0;
    const tp = tpPrice ? Number(tpPrice) : 0;
    if (!position.quantity || !position.avgEntryPrice) return null;
    return calculateTrade({
      contracts: position.quantity, entryPrice: position.avgEntryPrice,
      stopLoss: sl, target: tp, direction: position.direction, leverage: position.leverage,
    });
  }, [slPrice, tpPrice, position.quantity, position.avgEntryPrice, position.direction, position.leverage]);

  async function handleSave() {
    if (busy) return;
    if (!slPrice && !tpPrice) { showToast("Enter at least one of SL or TP.", "error"); return; }
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {};
      if (slPrice) payload.slPrice = Number(slPrice);
      if (tpPrice) payload.tpPrice = Number(tpPrice);
      const res = await axios.patch(BASE, payload, { withCredentials: true });
      if (res.data.success) {
        onSuccess({ slPrice: slPrice ? Number(slPrice) : position.slPrice, tpPrice: tpPrice ? Number(tpPrice) : position.tpPrice, slHit: false, tpHit: false });
        showToast("SL/TP updated.", "success"); onClose();
      } else showToast(res.data.message ?? "Failed.", "error");
    } catch (err: unknown) {
      showToast(axios.isAxiosError(err) ? (err.response?.data?.message ?? "Network error.") : "Error.", "error");
    } finally { setSubmitting(false); }
  }

  async function handleRemoveAll() {
    if (busy) return; setRemoving(true);
    try {
      const res = await axios.delete(BASE, { withCredentials: true });
      if (res.data.success) { onSuccess({ slPrice: null, tpPrice: null, slHit: false, tpHit: false }); showToast("SL/TP removed.", "success"); onClose(); }
      else showToast(res.data.message ?? "Failed.", "error");
    } catch { showToast("Error.", "error"); } finally { setRemoving(false); }
  }

  async function handleRemoveSL() {
    if (busy) return; setRemoving(true);
    try {
      const payload: Record<string, unknown> = {};
      if (position.tpPrice) payload.tpPrice = position.tpPrice;
      const res = await axios.patch(BASE, payload, { withCredentials: true });
      if (res.data.success) { onSuccess({ slPrice: null, slHit: false }); setSlPrice(""); showToast("Stop Loss removed.", "success"); }
      else showToast(res.data.message ?? "Failed.", "error");
    } catch { showToast("Error.", "error"); } finally { setRemoving(false); }
  }

  async function handleRemoveTP() {
    if (busy) return; setRemoving(true);
    try {
      const payload: Record<string, unknown> = {};
      if (position.slPrice) payload.slPrice = position.slPrice;
      const res = await axios.patch(BASE, payload, { withCredentials: true });
      if (res.data.success) { onSuccess({ tpPrice: null, tpHit: false }); setTpPrice(""); showToast("Take Profit removed.", "success"); }
      else showToast(res.data.message ?? "Failed.", "error");
    } catch { showToast("Error.", "error"); } finally { setRemoving(false); }
  }

  const sectionHead: React.CSSProperties = {
    fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", fontWeight: 600,
    letterSpacing: "1px", textTransform: "uppercase",
  };

  return (
    <div className="anim-fade-in" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
    }}>
      <div className="anim-modal-in" style={{
        width: "100%", maxWidth: "400px",
        background: "linear-gradient(180deg,#1a1a1a 0%,#121212 100%)",
        border: "1px solid rgba(37,179,23,0.15)",
        borderRadius: "16px", padding: "24px",
        boxShadow: "0 40px 80px rgba(0,0,0,0.7),0 0 40px rgba(37,179,23,0.04)",
        maxHeight: "90vh", overflowY: "auto",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <div>
            <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: "15px", fontWeight: 800, color: "#e5e2e1" }}>Set SL / TP</div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", color: "#879580", marginTop: "3px" }}>
              {position.symbol} ·{" "}
              <span style={{ color: position.direction === "LONG" ? "#25b317" : "#fc8181" }}>{position.direction}</span>
              {" · Avg $"}{position.avgEntryPrice.toLocaleString()}
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: "6px 8px" }}>✕</button>
        </div>

        {/* SL */}
        <div style={{ background: "rgba(179,37,23,0.06)", border: "1px solid rgba(252,129,129,0.15)", borderRadius: "10px", padding: "14px", marginBottom: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ ...sectionHead, color: "#fc8181" }}>Stop Loss</span>
            {hasSL && <button disabled={busy} onClick={handleRemoveSL} style={{ fontFamily: "'Manrope',sans-serif", fontSize: "10px", fontWeight: 700, padding: "3px 8px", background: "rgba(252,129,129,0.1)", border: "1px solid rgba(252,129,129,0.2)", borderRadius: "5px", color: "#fc8181", cursor: "pointer", opacity: busy ? 0.4 : 1 }}>Remove</button>}
          </div>
          <input type="number" min="0" value={slPrice} onChange={e => setSlPrice(e.target.value)}
            placeholder={hasSL ? `Current: $${position.slPrice}` : "No SL set"}
            className="ee-input sl-focus" />
        </div>

        {/* TP */}
        <div style={{ background: "rgba(37,179,23,0.06)", border: "1px solid rgba(37,179,23,0.15)", borderRadius: "10px", padding: "14px", marginBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ ...sectionHead, color: "#25b317" }}>Take Profit</span>
            {hasTP && <button disabled={busy} onClick={handleRemoveTP} style={{ fontFamily: "'Manrope',sans-serif", fontSize: "10px", fontWeight: 700, padding: "3px 8px", background: "rgba(37,179,23,0.1)", border: "1px solid rgba(37,179,23,0.2)", borderRadius: "5px", color: "#25b317", cursor: "pointer", opacity: busy ? 0.4 : 1 }}>Remove</button>}
          </div>
          <input type="number" min="0" value={tpPrice} onChange={e => setTpPrice(e.target.value)}
            placeholder={hasTP ? `Current: $${position.tpPrice}` : "No TP set"}
            className="ee-input tp-focus" />
        </div>

        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: "#3e4a39", marginBottom: "14px" }}>
          {position.direction === "LONG" ? "LONG: SL below entry · TP above entry" : "SHORT: SL above entry · TP below entry"}
        </div>

        {/* Preview */}
        {(slPrice || tpPrice) && sltpPreview && (
          <div style={{ background: "rgba(37,179,23,0.03)", border: "1px solid rgba(37,179,23,0.1)", borderRadius: "10px", padding: "14px", marginBottom: "14px" }}>
            <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: "11px", fontWeight: 700, color: "#bdcbb4", marginBottom: "10px", textTransform: "uppercase" as const, letterSpacing: "0.8px" }}>Risk Preview</div>
            {[
              sltpPreview.profit !== undefined && { label: "Gross Profit (TP)", value: `$${sltpPreview.profit.toLocaleString()}`, color: "#25b317" },
              (sltpPreview.profitCharges || sltpPreview.profitGst) && { label: "Profit Fees", value: `-$${((sltpPreview.profitCharges ?? 0) + (sltpPreview.profitGst ?? 0)).toFixed(2)}`, color: "#fc8181" },
              sltpPreview.totalProfit !== undefined && { label: "Net Profit", value: `$${sltpPreview.totalProfit.toLocaleString()}`, color: "#5be146", bold: true },
              sltpPreview.risk !== undefined && { label: "Gross Loss (SL)", value: `$${sltpPreview.risk.toLocaleString()}`, color: "#fc8181" },
              sltpPreview.totalRisk !== undefined && { label: "Net Loss", value: `$${sltpPreview.totalRisk.toLocaleString()}`, color: "#fc8181", bold: true },
              sltpPreview.marginRequired !== undefined && { label: "Margin Impact", value: `$${sltpPreview.marginRequired.toLocaleString()}`, color: "#fbbf24" },
            ].filter(Boolean).map((row: any, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", color: "#879580" }}>{row.label}</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", color: row.color, fontWeight: row.bold ? 700 : 500 }}>{row.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: "8px" }}>
          {(hasSL || hasTP) && (
            <button disabled={busy} onClick={handleRemoveAll} className="btn-ghost" style={{ flex: 1 }}>
              {removing ? "Removing…" : "Remove All"}
            </button>
          )}
          <button disabled={busy} onClick={handleSave} style={{
            flex: 1, padding: "12px", background: "#25b317", color: "#023a00",
            border: "none", borderRadius: "9px",
            fontFamily: "'Manrope',sans-serif", fontSize: "12px", fontWeight: 800,
            cursor: "pointer", opacity: busy ? 0.6 : 1,
            display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
            transition: "background 0.2s",
          }}>
            {submitting ? <><span style={{ width: 13, height: 13, border: "2px solid rgba(2,58,0,0.3)", borderTop: "2px solid #023a00", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} />Saving…</> : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Position Row ─────────────────────────────────────────────────────────

function PositionRow({ position: initialPosition, marketPrice, onClose, showToast }: {
  position: Position; marketPrice: number;
  onClose: (id: string) => void;
  showToast: (msg: string, type: "success" | "error") => void;
}) {
  const [position, setPosition] = useState(initialPosition);
  const [showSLTPModal, setShowSLTPModal] = useState(false);
  const livePositions: PositionStateItem[] = useSelector((state: RootState) => state.positions.positions);
  const isLong = position.direction === "LONG";
  const live = livePositions.find(p => p.positionId === position.id);
  const unrealized = live?.unrealizedPnl ?? 0;
  const pnlPositive = unrealized >= 0;
  const hasSLTP = position.slPrice || position.tpPrice;

  return (
    <>
      {showSLTPModal && (
        <SLTPModal position={position} onClose={() => setShowSLTPModal(false)}
          onSuccess={u => setPosition(p => ({ ...p, ...u }))} showToast={showToast} />
      )}
      <div className="row-hover anim-fade-up" style={{
        background: "linear-gradient(180deg,#121212 0%,#0e0e0e 100%)",
        border: "1px solid rgba(37,179,23,0.06)",
        borderRadius: "10px", padding: "14px 16px",
        display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px",
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" as const, marginBottom: "6px" }}>
            <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: "13px", fontWeight: 700, color: "#e5e2e1" }}>{position.symbol}</span>
            <EEBadge variant={isLong ? "green" : "red"}>{position.direction}</EEBadge>
            <EEBadge variant="blue">{position.leverage}x</EEBadge>
            {!position.isOpen && <EEBadge variant="gray">Closed</EEBadge>}
          </div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", color: "#879580", marginBottom: "3px" }}>
            Qty: {position.quantity.toLocaleString()} · Avg: ${position.avgEntryPrice.toLocaleString()}
          </div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: "#3e4a39", marginBottom: hasSLTP ? "6px" : 0 }}>
            Margin: ${position.marginUsed.toLocaleString()}
          </div>
          {hasSLTP && (
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" as const }}>
              {position.slPrice && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: "#fc8181" }}>SL ${position.slPrice}{position.slHit ? " ✓" : ""}</span>}
              {position.tpPrice && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: "#25b317" }}>TP ${position.tpPrice}{position.tpHit ? " ✓" : ""}</span>}
            </div>
          )}
        </div>
        <div style={{ textAlign: "right" as const, flexShrink: 0 }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "12px", color: "#879580", marginBottom: "4px" }}>
            Mark: <span style={{ color: "#e5e2e1" }}>${marketPrice.toLocaleString()}</span>
          </div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "15px", fontWeight: 700, color: pnlPositive ? "#25b317" : "#fc8181", marginBottom: "4px" }}>
            {pnlPositive ? "+" : ""}${unrealized.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: "#3e4a39", marginBottom: "8px" }}>
            {new Date(position.createdAt).toLocaleDateString("en-US", { dateStyle: "short" })}
          </div>
          {position.isOpen && (
            <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end", flexWrap: "wrap" as const }}>
              <button onClick={() => setShowSLTPModal(true)} style={{
                padding: "5px 10px", background: "rgba(91,225,70,0.08)",
                border: "1px solid rgba(91,225,70,0.2)", borderRadius: "6px",
                color: "#5be146", fontFamily: "'Manrope',sans-serif",
                fontSize: "10px", fontWeight: 700, cursor: "pointer", transition: "all 0.2s",
              }}>{hasSLTP ? "Edit SL/TP" : "Set SL/TP"}</button>
              <button onClick={() => onClose(position.id)} style={{
                padding: "5px 10px", background: "rgba(251,146,60,0.08)",
                border: "1px solid rgba(251,146,60,0.2)", borderRadius: "6px",
                color: "#fb923c", fontFamily: "'Manrope',sans-serif",
                fontSize: "10px", fontWeight: 700, cursor: "pointer", transition: "all 0.2s",
              }}>Close</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Preview Rows ───────────────────────────────────────────────────────────

function PreviewRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "7px" }}>
      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", color: "#879580" }}>{label}</span>
      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", color, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyPanel({ icon, label, sub }: { icon: string; label: string; sub: string }) {
  return (
    <div style={{
      border: "1px dashed rgba(37,179,23,0.15)", borderRadius: "10px",
      padding: "32px 20px", textAlign: "center" as const,
      background: "rgba(37,179,23,0.02)",
    }}>
      <span className="material-symbols-outlined" style={{ fontSize: "28px", color: "rgba(37,179,23,0.25)", display: "block", marginBottom: "8px" }}>{icon}</span>
      <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: "13px", fontWeight: 600, color: "#bdcbb4", marginBottom: "3px" }}>{label}</div>
      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", color: "#3e4a39" }}>{sub}</div>
    </div>
  );
}

// ─── Section Header ─────────────────────────────────────────────────────────

function SectionLabel({ icon, label, count }: { icon: string; label: string; count?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
      <span className="material-symbols-outlined" style={{ fontSize: "15px", color: "#25b317" }}>{icon}</span>
      <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: "11px", fontWeight: 700, color: "#879580", letterSpacing: "1.2px", textTransform: "uppercase" as const }}>{label}</span>
      {count !== undefined && (
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", background: "rgba(37,179,23,0.1)", color: "#25b317", padding: "2px 7px", borderRadius: "4px", border: "1px solid rgba(37,179,23,0.2)" }}>{count}</span>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

function AccountPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const totalPnl = useSelector((state: RootState) => state.positions.totalUnrealizedPnl);
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [symbol, setSymbol] = useState<SymbolKey>("BTCUSD");
  const [form, setForm] = useState(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prices = useSelector((state: RootState) => state.market);

  const marketPrice = useMemo<number>(() => symbol === "XAUUSD" ? Number(prices["PAXGUSD"]) : Number(prices[symbol]), [symbol, prices]);
  const effectiveEntryPrice = useMemo<number>(() => form.orderType === "MARKET" ? marketPrice : form.price ? Number(form.price) : 0, [form.orderType, form.price, marketPrice]);

  const tradeResult = useMemo<TradeResult | null>(() => {
    if (!form.quantity || !effectiveEntryPrice) return null;
    return calculateTrade({
      contracts: Number(form.quantity), entryPrice: effectiveEntryPrice,
      stopLoss: form.slPrice ? Number(form.slPrice) : 0,
      target: form.tpPrice ? Number(form.tpPrice) : 0,
      direction: form.direction, leverage: form.leverage ? Number(form.leverage) : 1,
    });
  }, [form.quantity, effectiveEntryPrice, form.slPrice, form.tpPrice, form.direction, form.leverage]);

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

  const showToast = useCallback((message: string, type: "success" | "error") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    async function fetchAll() {
      try {
        const [accountRes, ordersRes, positionsRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_BACKEND_URL}/accounts/${id}`, { withCredentials: true }),
          axios.get(`${import.meta.env.VITE_BACKEND_URL}/accounts/${id}/orders`, { withCredentials: true }),
          axios.get(`${import.meta.env.VITE_BACKEND_URL}/accounts/${id}/positions`, { withCredentials: true }),
        ]);
        if (cancelled) return;
        if (accountRes.data.success) setAccount(accountRes.data.data);
        if (ordersRes.data.success) {
          const sorted = [...ordersRes.data.data].sort((a: Order, b: Order) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setOrders(sorted);
        }
        if (positionsRes.data.success) setPositions(positionsRes.data.data);
      } catch { if (!cancelled) showToast("Failed to load account data.", "error"); }
      finally { if (!cancelled) setLoading(false); }
    }
    fetchAll();
    return () => { cancelled = true; };
  }, [id, showToast, orders]);

  function openModal(sym: SymbolKey, dir: Direction) { setForm({ ...DEFAULT_FORM, direction: dir }); setSymbol(sym); setIsOpenModal(true); }
  function closeModal() { setIsOpenModal(false); }
  function setField<K extends keyof typeof DEFAULT_FORM>(key: K, value: (typeof DEFAULT_FORM)[K]) { setForm(prev => ({ ...prev, [key]: value })); }

  async function handlePlaceTrade() {
    if (submitting) return;
    if (!form.quantity || Number(form.quantity) <= 0) { showToast("Quantity must be greater than 0.", "error"); return; }
    if (form.orderType === "LIMIT" && (!form.price || Number(form.price) <= 0)) { showToast("Enter a valid limit price.", "error"); return; }
    setSubmitting(true);
    const payload: Record<string, unknown> = {
      symbol, direction: form.direction, type: form.orderType,
      quantity: Number(form.quantity),
      price: form.orderType === "MARKET" ? marketPrice : Number(form.price),
      ttlSeconds: TTL_MAP[form.ttl], leverage: form.leverage,
    };
    if (form.showSL && form.slPrice) { payload.slPrice = Number(form.slPrice); payload.slQty = form.slQty ? Number(form.slQty) : undefined; }
    if (form.showTP && form.tpPrice) { payload.tpPrice = Number(form.tpPrice); payload.tpQty = form.tpQty ? Number(form.tpQty) : undefined; }
    try {
      const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/accounts/${id}/orders`, payload, { withCredentials: true });
      if (response.data.success) { setOrders(prev => [response.data.data, ...prev]); showToast("Trade placed successfully.", "success"); closeModal(); }
      else showToast(response.data.message ?? "Failed to place trade.", "error");
    } catch (err: unknown) {
      showToast(axios.isAxiosError(err) ? (err.response?.data?.message ?? "Network error.") : "Unexpected error.", "error");
    } finally { setSubmitting(false); }
  }

  async function handleClosePosition(position: Position) {
    if (submitting) return; setSubmitting(true);
    try {
      const oppDir = position.direction === "LONG" ? "SHORT" : "LONG";
      const closePrice = position.symbol === "XAUUSD" ? Number(prices["PAXGUSD"]) : Number(prices["BTCUSD"]);
      const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/accounts/${id}/orders`, { symbol: position.symbol, direction: oppDir, type: "MARKET", quantity: position.quantity, price: closePrice, ttlSeconds: TTL_MAP["5m"], leverage: position.leverage }, { withCredentials: true });
      if (response.data.success) { setOrders(prev => [response.data.data, ...prev]); showToast("Position closed.", "success"); }
      else showToast(response.data.message ?? "Failed to close.", "error");
    } catch (err: unknown) { showToast(axios.isAxiosError(err) ? (err.response?.data?.message ?? "Network error.") : "Error.", "error"); }
    finally { setSubmitting(false); }
  }

  async function handleCancelOrder(orderId: string) {
    try {
      const res = await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/accounts/${id}/orders/${orderId}`, { withCredentials: true });
      if (res.data.success) { setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "CANCELLED" } : o)); showToast("Order cancelled.", "success"); }
      else showToast(res.data.message || "Failed.", "error");
    } catch { showToast("Failed to cancel order.", "error"); }
  }

  // ─── Loading ─────────────────────────────────────────────────────────────

  if (loading) return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div style={{ minHeight: "100vh", background: "#050505", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "14px" }}>
        <div style={{ width: 38, height: 38, border: "2px solid rgba(37,179,23,0.2)", borderTop: "2px solid #25b317", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "12px", color: "#879580", letterSpacing: "2px" }}>LOADING ACCOUNT…</span>
      </div>
    </>
  );

  if (!account) return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div style={{ minHeight: "100vh", background: "#050505", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div style={{ background: "linear-gradient(180deg,#121212 0%,#0e0e0e 100%)", border: "1px solid rgba(252,129,129,0.15)", borderRadius: "16px", padding: "32px", maxWidth: "360px", width: "100%", textAlign: "center" as const }}>
          <span className="material-symbols-outlined" style={{ fontSize: "36px", color: "#fc8181", marginBottom: "12px", display: "block" }}>error</span>
          <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: "16px", fontWeight: 800, color: "#e5e2e1", marginBottom: "8px" }}>Account Not Found</div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", color: "#879580", marginBottom: "20px" }}>This account may have been removed or you don't have access.</div>
          <button onClick={() => navigate("/dashboard")} style={{ padding: "11px 24px", background: "#25b317", color: "#023a00", border: "none", borderRadius: "9px", fontFamily: "'Manrope',sans-serif", fontSize: "12px", fontWeight: 800, cursor: "pointer", letterSpacing: "0.5px" }}>← Back to Dashboard</button>
        </div>
      </div>
    </>
  );

  const freeMargin = account.balance;
  const marginUtilPct = account.balance > 0 ? ((account.marginUsed / account.balance) * 100).toFixed(1) : "0.0";
  const pnlPositive = totalPnl >= 0;

  const labelStyle: React.CSSProperties = {
    fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", fontWeight: 600,
    color: "#879580", letterSpacing: "1.2px", textTransform: "uppercase", marginBottom: "7px", display: "block",
  };

  return (
    <>
      <style>{GLOBAL_CSS}</style>

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} />}

      <div style={{ minHeight: "100vh", background: "#050505", fontFamily: "'Manrope',sans-serif", color: "#e5e2e1" }}>

        {/* Top Bar */}
        <header style={{
          position: "sticky", top: 0, zIndex: 40,
          background: "rgba(5,5,5,0.92)", backdropFilter: "blur(16px)",
          borderBottom: "1px solid #1c1b1b",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 24px", height: "60px",
        }}>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 800, color: "#e5e2e1", letterSpacing: "-0.3px" }}>{account.name}</div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: "#879580" }}>
              Trading Account · {new Date(account.createdAt).toLocaleDateString("en-US", { dateStyle: "medium" })}
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" as const }}>
            <button onClick={() => navigate("/dashboard")} className="btn-ghost">← Dashboard</button>
            <button onClick={() => navigate(`/accounts/${id}/overview`)} style={{
              padding: "7px 14px", background: "rgba(37,179,23,0.1)", color: "#25b317",
              border: "1px solid rgba(37,179,23,0.2)", borderRadius: "8px",
              fontFamily: "'Manrope',sans-serif", fontSize: "11px", fontWeight: 700, cursor: "pointer",
              transition: "all 0.2s",
            }}>Overview</button>
            <button onClick={() => navigate(`/accounts/${id}/journals`)} style={{
              padding: "7px 14px", background: "rgba(168,85,247,0.08)", color: "#c084fc",
              border: "1px solid rgba(168,85,247,0.2)", borderRadius: "8px",
              fontFamily: "'Manrope',sans-serif", fontSize: "11px", fontWeight: 700, cursor: "pointer",
              transition: "all 0.2s",
            }}>Journals</button>
            <button onClick={() => navigate(`/accounts/${id}/ai-feedback`)} style={{
              padding: "7px 14px", background: "rgba(168,85,247,0.08)", color: "#c084fc",
              border: "1px solid rgba(168,85,247,0.2)", borderRadius: "8px",
              fontFamily: "'Manrope',sans-serif", fontSize: "11px", fontWeight: 700, cursor: "pointer",
              transition: "all 0.2s",
            }}>AI Feedback</button>
          </div>
        </header>

        <main style={{ maxWidth: "1280px", margin: "0 auto", padding: "24px 20px" }}>

          {/* Stats */}
          <div className="stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "14px", marginBottom: "24px" }}>
            <StatCard label="Balance" value={`$${account.balance.toLocaleString()}`} icon="account_balance_wallet" color="blue" delay="0s" />
            <StatCard label="Margin Used" value={`$${account.marginUsed.toLocaleString()}`} sub={`${marginUtilPct}% of balance`} icon="pie_chart" color="yellow" delay="0.05s" />
            <StatCard label="Free Margin" value={`$${freeMargin.toLocaleString()}`} icon="savings" color="green" delay="0.1s" />
            <StatCard label="PnL" value={`${pnlPositive ? "+" : ""}$${totalPnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} icon="trending_up" color={pnlPositive ? "green" : "red"} delay="0.15s" />
          </div>

          {/* Main Grid */}
          <div className="main-grid-account" style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "20px" }}>

            {/* Markets */}
            <aside>
              <SectionLabel icon="query_stats" label="Markets" />
              <div style={{ display: "flex", flexDirection: "column" as const, gap: "10px" }}>
                <MarketRow symbol="BTCUSD" name="Bitcoin / USD" price={prices.BTCUSD} accent="#F7931A"
                  onBuy={() => openModal("BTCUSD", "LONG")} onSell={() => openModal("BTCUSD", "SHORT")} />
                <MarketRow symbol="XAUUSD" name="Gold / USD" price={prices.PAXGUSD} accent="#FFD700"
                  onBuy={() => openModal("XAUUSD", "LONG")} onSell={() => openModal("XAUUSD", "SHORT")} />
              </div>
            </aside>

            {/* Positions + Orders */}
            <section>
              <SectionLabel icon="show_chart" label="Positions" count={positions.length} />
              {positions.length === 0
                ? <div style={{ marginBottom: "20px" }}><EmptyPanel icon="show_chart" label="No Open Positions" sub="Your active trades will appear here." /></div>
                : <div style={{ display: "flex", flexDirection: "column" as const, gap: "8px", marginBottom: "20px" }}>
                    {positions.map(p => <PositionRow key={p.id} position={p} marketPrice={marketPrice} onClose={() => handleClosePosition(p)} showToast={showToast} />)}
                  </div>
              }

              <SectionLabel icon="receipt_long" label="Orders" count={orders.length} />
              {orders.length === 0
                ? <EmptyPanel icon="receipt_long" label="No Orders Yet" sub="Place your first trade from the markets panel." />
                : <div style={{ display: "flex", flexDirection: "column" as const, gap: "8px" }}>
                    {orders.map(o => <OrderRow key={o.id} order={o} onCancel={handleCancelOrder} />)}
                  </div>
              }
            </section>
          </div>
        </main>
      </div>

      {/* ─── Trade Modal ─────────────────────────────────────────────── */}
      {isOpenModal && (
        <div className="anim-fade-in" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }} style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
        }}>
          <div className="anim-modal-in" style={{
            width: "100%", maxWidth: "440px",
            background: "linear-gradient(180deg,#1a1a1a 0%,#121212 100%)",
            border: "1px solid rgba(37,179,23,0.15)",
            borderRadius: "16px",
            maxHeight: "90vh", overflowY: "auto",
            boxShadow: "0 40px 80px rgba(0,0,0,0.7),0 0 40px rgba(37,179,23,0.04)",
          }}>
            <div style={{ padding: "24px" }}>

              {/* Modal Header */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "22px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: symbol === "BTCUSD" ? "#F7931A" : "#FFD700" }} />
                    <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: "18px", fontWeight: 800, color: "#e5e2e1", letterSpacing: "-0.3px" }}>{symbol}</span>
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", color: "#879580" }}>
                    Market: <span style={{ color: "#5be146" }}>${marketPrice.toLocaleString()}</span>
                  </div>
                </div>
                <button onClick={closeModal} className="btn-ghost" style={{ padding: "6px 8px" }}>✕</button>
              </div>

              {/* Direction */}
              <div style={{ marginBottom: "16px" }}>
                <label style={labelStyle}>Direction</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button className={`toggle-btn${form.direction === "LONG" ? " active-long" : ""}`} onClick={() => setField("direction", "LONG")}>Long</button>
                  <button className={`toggle-btn${form.direction === "SHORT" ? " active-short" : ""}`} onClick={() => setField("direction", "SHORT")}>Short</button>
                </div>
              </div>

              {/* Order Type */}
              <div style={{ marginBottom: "16px" }}>
                <label style={labelStyle}>Order Type</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button className={`toggle-btn${form.orderType === "MARKET" ? " active-market" : ""}`} onClick={() => setField("orderType", "MARKET")}>Market</button>
                  <button className={`toggle-btn${form.orderType === "LIMIT" ? " active-limit" : ""}`} onClick={() => setField("orderType", "LIMIT")}>Limit</button>
                </div>
              </div>

              {/* Quantity */}
              <div style={{ marginBottom: "16px" }}>
                <label style={labelStyle}>Quantity (Contracts)</label>
                <input type="number" min="1" value={form.quantity} onChange={e => setField("quantity", e.target.value)} placeholder="e.g. 1000 contracts = 1 lot" className="ee-input" />
              </div>

              {/* Price */}
              <div style={{ marginBottom: "16px" }}>
                <label style={labelStyle}>{form.orderType === "MARKET" ? "Entry Price (live)" : "Limit Price"}</label>
                <input type="number" min="0" readOnly={form.orderType === "MARKET"}
                  value={form.orderType === "MARKET" ? marketPrice : form.price}
                  onChange={e => setField("price", e.target.value)}
                  placeholder="Enter limit price" className="ee-input" />
              </div>

              {/* SL / TP Toggles */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "14px" }}>
                <button onClick={() => setField("showSL", !form.showSL)} style={{
                  padding: "9px", borderRadius: "8px", border: "none", cursor: "pointer",
                  fontFamily: "'Manrope',sans-serif", fontSize: "11px", fontWeight: 700, letterSpacing: "0.5px",
                  background: form.showSL ? "rgba(252,129,129,0.15)" : "#1c1b1b",
                  color: form.showSL ? "#fc8181" : "#879580",
                  transition: "all 0.2s",
                }}>{form.showSL ? "Remove SL" : "Add Stop Loss"}</button>
                <button onClick={() => setField("showTP", !form.showTP)} style={{
                  padding: "9px", borderRadius: "8px", border: "none", cursor: "pointer",
                  fontFamily: "'Manrope',sans-serif", fontSize: "11px", fontWeight: 700, letterSpacing: "0.5px",
                  background: form.showTP ? "rgba(37,179,23,0.12)" : "#1c1b1b",
                  color: form.showTP ? "#25b317" : "#879580",
                  transition: "all 0.2s",
                }}>{form.showTP ? "Remove TP" : "Add Take Profit"}</button>
              </div>

              {/* SL */}
              {form.showSL && (
                <div style={{ background: "rgba(179,37,23,0.06)", border: "1px solid rgba(252,129,129,0.15)", borderRadius: "10px", padding: "14px", marginBottom: "10px" }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: "#fc8181", letterSpacing: "1px", textTransform: "uppercase" as const, marginBottom: "8px" }}>Stop Loss</div>
                  <input type="number" min="0" value={form.slPrice} onChange={e => setField("slPrice", e.target.value)} placeholder="SL Price" className={`ee-input sl-focus${sltpValidation.slError ? " error" : ""}`} style={sltpValidation.slError ? { borderColor: "rgba(252,129,129,0.5)" } : {}} />
                  {sltpValidation.slError && <div style={{ marginTop: "5px", fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: "#fc8181" }}>⚠ Invalid SL for {form.direction}</div>}
                </div>
              )}

              {/* TP */}
              {form.showTP && (
                <div style={{ background: "rgba(37,179,23,0.06)", border: "1px solid rgba(37,179,23,0.15)", borderRadius: "10px", padding: "14px", marginBottom: "10px" }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: "#25b317", letterSpacing: "1px", textTransform: "uppercase" as const, marginBottom: "8px" }}>Take Profit</div>
                  <input type="number" min="0" value={form.tpPrice} onChange={e => setField("tpPrice", e.target.value)} placeholder="TP Price" className="ee-input tp-focus" style={sltpValidation.tpError ? { borderColor: "rgba(252,129,129,0.5)" } : {}} />
                  {sltpValidation.tpError && <div style={{ marginTop: "5px", fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: "#fc8181" }}>⚠ Invalid TP for {form.direction}</div>}
                </div>
              )}

              {/* Trade Preview */}
              {tradeResult && (parseFloat(form.slPrice) > 0 || parseFloat(form.tpPrice) > 0 || tradeResult.marginRequired) && (
                <div style={{ background: "rgba(37,179,23,0.03)", border: "1px solid rgba(37,179,23,0.1)", borderRadius: "10px", padding: "14px", marginBottom: "14px" }}>
                  <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: "11px", fontWeight: 700, color: "#bdcbb4", marginBottom: "10px", textTransform: "uppercase" as const, letterSpacing: "0.8px" }}>Trade Preview</div>
                  {tradeResult.marginRequired !== undefined && <PreviewRow label="Margin Required" value={`$${tradeResult.marginRequired.toLocaleString()}`} color="#fbbf24" />}
                  {tradeResult.profit !== undefined && <PreviewRow label="Gross Profit" value={`$${tradeResult.profit.toLocaleString()}`} color="#25b317" />}
                  {(tradeResult.profitCharges !== undefined || tradeResult.profitGst !== undefined) && <PreviewRow label="Profit Charges" value={`-$${((tradeResult.profitCharges ?? 0) + (tradeResult.profitGst ?? 0)).toFixed(2)}`} color="#fc8181" />}
                  {tradeResult.totalProfit !== undefined && <PreviewRow label="Net Profit" value={`$${tradeResult.totalProfit.toLocaleString()}`} color="#5be146" />}
                  {tradeResult.risk !== undefined && <PreviewRow label="Gross Loss" value={`$${tradeResult.risk.toLocaleString()}`} color="#fc8181" />}
                  {(tradeResult.riskCharges !== undefined || tradeResult.riskGst !== undefined) && <PreviewRow label="Loss Charges" value={`-$${((tradeResult.riskCharges ?? 0) + (tradeResult.riskGst ?? 0)).toFixed(2)}`} color="#fc8181" />}
                  {tradeResult.totalRisk !== undefined && <PreviewRow label="Net Loss" value={`$${tradeResult.totalRisk.toLocaleString()}`} color="#fc8181" />}
                </div>
              )}

              {/* TTL */}
              <div style={{ marginBottom: "16px" }}>
                <label style={labelStyle}>Time To Live</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "6px" }}>
                  {TTL_OPTIONS.map(item => (
                    <button key={item} onClick={() => setField("ttl", item)} className={`ttl-btn${form.ttl === item ? " active" : ""}`}>{item}</button>
                  ))}
                </div>
              </div>

              {/* Leverage */}
              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>Leverage</label>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "13px", color: "#5be146", fontWeight: 600 }}>{form.leverage}x</span>
                </div>
                <input type="range" min="1" max="200" value={form.leverage} onChange={e => setField("leverage", Number(e.target.value))} className="range-green" style={{ width: "100%", accentColor: "#25b317" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: "#3e4a39", marginTop: "4px" }}>
                  <span>1x</span><span>200x</span>
                </div>
              </div>

              {/* Submit */}
              <button onClick={handlePlaceTrade} disabled={submitting} style={{
                width: "100%", padding: "14px",
                background: form.direction === "LONG" ? "#25b317" : "rgba(252,129,129,0.15)",
                color: form.direction === "LONG" ? "#023a00" : "#fc8181",
                border: form.direction === "LONG" ? "none" : "1px solid rgba(252,129,129,0.3)",
                borderRadius: "9px",
                fontFamily: "'Manrope',sans-serif", fontSize: "13px", fontWeight: 800,
                letterSpacing: "0.8px", textTransform: "uppercase" as const,
                cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                transition: "all 0.2s",
              }}>
                {submitting
                  ? <><span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.2)", borderTop: "2px solid currentColor", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} />Placing…</>
                  : `Place ${form.direction} Trade`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AccountPage;