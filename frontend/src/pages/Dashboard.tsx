import axios from "axios";
import { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../redux/store";
import { useNavigate } from "react-router-dom";

/* ─────────────────────────────────────────
   TYPES
───────────────────────────────────────── */
interface User {
  id: string;
  email: string;
  name: string;
}
interface Account {
  id: string;
  userId: string;
  balance: number;
  name: string;
  createdAt: string;
}
type AlertType = "GTE" | "LTE";
interface Alert {
  id: string;
  name: string;
  price: number;
  type: AlertType;
  symbol: string;
  status: "PENDING" | "TRIGGERED";
}
type PlanName = "BASIC" | "PRO" | "PREMIUM";

/* ─────────────────────────────────────────
   GLOBAL STYLES (injected)
───────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@300;400;500;600&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { -webkit-font-smoothing: antialiased; }

  ::-webkit-scrollbar { width: 3px; height: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #1c1c1c; border-radius: 4px; }

  .material-symbols-outlined {
    font-family: 'Material Symbols Outlined';
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
    font-style: normal;
    line-height: 1;
    letter-spacing: normal;
    text-transform: none;
    white-space: nowrap;
    word-wrap: normal;
    direction: ltr;
    -webkit-font-smoothing: antialiased;
    user-select: none;
  }

  @keyframes pulse-glow {
    0%, 100% { opacity: 1; box-shadow: 0 0 8px rgba(37,179,23,0.4); }
    50% { opacity: 0.6; box-shadow: 0 0 16px rgba(37,179,23,0.8); }
  }
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-8px) scale(0.97); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes ticker-scroll {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  @keyframes price-flash {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  @keyframes modal-in {
    from { opacity: 0; transform: scale(0.94) translateY(12px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }

  .skeleton {
    background: linear-gradient(90deg, #1c1b1b 25%, #2a2a2a 50%, #1c1b1b 75%);
    background-size: 200% 100%;
    animation: shimmer 1.6s infinite;
    border-radius: 6px;
  }

  .anim-fade-up { animation: fadeUp 0.5s ease both; }
  .anim-fade-in { animation: fadeIn 0.4s ease both; }

  .card-hover {
    transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
  }
  .card-hover:hover {
    border-color: rgba(37,179,23,0.25) !important;
    transform: translateY(-1px);
    box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(37,179,23,0.05);
  }

  .btn-primary {
    transition: all 0.2s ease;
  }
  .btn-primary:hover {
    background: #5be146 !important;
    box-shadow: 0 0 20px rgba(37,179,23,0.35);
    transform: translateY(-1px);
  }
  .btn-primary:active {
    transform: translateY(0) scale(0.97);
  }

  .list-row {
    transition: border-color 0.2s, background 0.2s;
  }
  .list-row:hover {
    border-color: rgba(37,179,23,0.2) !important;
    background: rgba(37,179,23,0.04) !important;
  }

  .nav-link {
    transition: all 0.2s ease;
  }
  .nav-link:hover {
    color: #e5e2e1 !important;
    background: rgba(255,255,255,0.04) !important;
  }

  .overlay-bg {
    animation: fadeIn 0.2s ease;
  }
  .modal-card {
    animation: modal-in 0.3s cubic-bezier(0.34,1.56,0.64,1) both;
  }

  .price-live {
    animation: price-flash 2s ease infinite;
  }
  .dot-glow {
    animation: pulse-glow 2s ease infinite;
  }

  .ticker-wrap {
    overflow: hidden;
    width: 100%;
  }
  .ticker-inner {
    display: flex;
    gap: 40px;
    width: max-content;
    animation: ticker-scroll 24s linear infinite;
  }

  input:focus, select:focus {
    outline: none;
    border-color: rgba(37,179,23,0.5) !important;
    box-shadow: 0 0 0 3px rgba(37,179,23,0.08);
  }

  @media (max-width: 768px) {
    .sidebar-desktop { display: none !important; }
    .mobile-header { display: flex !important; }
    .main-content { margin-left: 0 !important; }
    .grid-2col { grid-template-columns: 1fr !important; }
  }
  @media (min-width: 769px) {
    .mobile-header { display: none !important; }
  }
`;

/* ─────────────────────────────────────────
   SKELETON COMPONENTS
───────────────────────────────────────── */
function SkeletonBox({
  w,
  h,
  className = "",
}: {
  w?: string;
  h?: string;
  className?: string;
}) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width: w || "100%", height: h || "16px" }}
    />
  );
}

function PriceCardSkeleton() {
  return (
    <div
      style={{
        background: "linear-gradient(180deg,#121212 0%,#0e0e0e 100%)",
        border: "1px solid rgba(37,179,23,0.08)",
        borderRadius: "12px",
        padding: "22px 24px",
      }}
    >
      <SkeletonBox w="80px" h="11px" className="mb-3" />
      <SkeletonBox w="160px" h="28px" className="mb-2" />
      <SkeletonBox w="100px" h="11px" />
    </div>
  );
}

function AlertRowSkeleton() {
  return (
    <div
      style={{
        background: "#1c1b1b",
        border: "1px solid rgba(255,255,255,0.04)",
        borderRadius: "10px",
        padding: "14px 16px",
        marginBottom: "8px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div style={{ flex: 1 }}>
        <SkeletonBox w="120px" h="13px" className="mb-2" />
        <div style={{ display: "flex", gap: "6px" }}>
          <SkeletonBox w="55px" h="18px" />
          <SkeletonBox w="65px" h="18px" />
          <SkeletonBox w="70px" h="18px" />
        </div>
      </div>
      <div style={{ display: "flex", gap: "6px" }}>
        <SkeletonBox w="30px" h="28px" />
        <SkeletonBox w="30px" h="28px" />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   BADGE
───────────────────────────────────────── */
function Badge({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant: "blue" | "green" | "red" | "yellow";
}) {
  const map = {
    blue: {
      bg: "rgba(91,225,70,0.1)",
      color: "#5be146",
      border: "rgba(91,225,70,0.2)",
    },
    green: {
      bg: "rgba(37,179,23,0.12)",
      color: "#25b317",
      border: "rgba(37,179,23,0.25)",
    },
    red: {
      bg: "rgba(179,37,23,0.12)",
      color: "#fc8181",
      border: "rgba(179,37,23,0.25)",
    },
    yellow: {
      bg: "rgba(251,191,36,0.1)",
      color: "#fbbf24",
      border: "rgba(251,191,36,0.2)",
    },
  };
  const s = map[variant];
  return (
    <span
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: "10px",
        fontWeight: 600,
        padding: "3px 8px",
        borderRadius: "4px",
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        letterSpacing: "0.5px",
        textTransform: "uppercase" as const,
      }}
    >
      {children}
    </span>
  );
}

/* ─────────────────────────────────────────
   EMPTY STATE
───────────────────────────────────────── */
function EmptyState({
  icon,
  label,
  sublabel,
}: {
  icon: string;
  label: string;
  sublabel?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        border: "1px dashed rgba(37,179,23,0.15)",
        borderRadius: "12px",
        background: "rgba(37,179,23,0.02)",
        textAlign: "center" as const,
        animation: "fadeIn 0.4s ease",
      }}
    >
      <span
        className="material-symbols-outlined"
        style={{
          fontSize: "36px",
          color: "rgba(37,179,23,0.3)",
          marginBottom: "10px",
        }}
      >
        {icon}
      </span>
      <div
        style={{
          fontFamily: "'Manrope', sans-serif",
          fontSize: "13px",
          fontWeight: 600,
          color: "#bdcbb4",
          marginBottom: "4px",
        }}
      >
        {label}
      </div>
      {sublabel && (
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "11px",
            color: "#3e4a39",
          }}
        >
          {sublabel}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   PRICE CARD
───────────────────────────────────────── */
function PriceCard({
  symbol,
  price,
  change,
  icon,
  accent,
}: {
  symbol: string;
  price: number;
  change: string;
  icon: string;
  accent: string;
}) {
  const isPos = change.startsWith("+");
  return (
    <div
      className="card-hover"
      style={{
        background: "linear-gradient(180deg,#121212 0%,#0e0e0e 100%)",
        border: "1px solid rgba(37,179,23,0.1)",
        borderRadius: "12px",
        padding: "22px 24px",
        position: "relative",
        overflow: "hidden",
        cursor: "default",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -30,
          right: -30,
          width: 100,
          height: 100,
          borderRadius: "50%",
          background: accent,
          opacity: 0.06,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "10px",
        }}
      >
        <div
          className="dot-glow"
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: accent,
          }}
        />
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "11px",
            color: "#879580",
            letterSpacing: "1.5px",
            textTransform: "uppercase" as const,
          }}
        >
          {symbol}
        </span>
      </div>
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "26px",
          fontWeight: 600,
          color: "#e5e2e1",
          letterSpacing: "-1px",
          marginBottom: "6px",
        }}
      >
        ${price.toLocaleString()}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <span
          className="material-symbols-outlined"
          style={{ fontSize: "14px", color: isPos ? "#25b317" : "#fc8181" }}
        >
          {isPos ? "trending_up" : "trending_down"}
        </span>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "11px",
            color: isPos ? "#25b317" : "#fc8181",
          }}
        >
          {change} · Live
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   MODAL
───────────────────────────────────────── */
function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="overlay-bg"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        background: "rgba(0,0,0,0.8)",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        className="modal-card"
        style={{
          background: "linear-gradient(180deg,#1a1a1a 0%,#121212 100%)",
          border: "1px solid rgba(37,179,23,0.15)",
          borderRadius: "16px",
          padding: "28px",
          width: "100%",
          maxWidth: "440px",
          boxShadow:
            "0 40px 80px rgba(0,0,0,0.7), 0 0 40px rgba(37,179,23,0.04)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "24px",
          }}
        >
          <span
            style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: "16px",
              fontWeight: 700,
              color: "#e5e2e1",
              letterSpacing: "-0.3px",
            }}
          >
            {title}
          </span>
          <button
            onClick={onClose}
            style={{
              width: 30,
              height: 30,
              background: "#1c1b1b",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "8px",
              color: "#879580",
              fontSize: "13px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s",
              fontFamily: "inherit",
            }}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <label
        style={{
          display: "block",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "10px",
          fontWeight: 600,
          color: "#879580",
          letterSpacing: "1.2px",
          textTransform: "uppercase" as const,
          marginBottom: "7px",
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "13px",
  padding: "11px 14px",
  background: "#1c1b1b",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: "8px",
  color: "#e5e2e1",
  boxSizing: "border-box" as const,
  transition: "border-color 0.2s, box-shadow 0.2s",
};

/* ─────────────────────────────────────────
   NAV ITEM
───────────────────────────────────────── */
function NavItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={active ? "" : "nav-link"}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "10px 16px",
        background: active ? "rgba(37,179,23,0.06)" : "transparent",
        border: active ? "none" : "none",
        borderLeft: active ? "3px solid #25b317" : "3px solid transparent",
        color: active ? "#25b317" : "#879580",
        cursor: "pointer",
        textAlign: "left" as const,
        fontFamily: "'Manrope', sans-serif",
        fontWeight: active ? 700 : 500,
        fontSize: "11px",
        letterSpacing: "0.8px",
        textTransform: "uppercase" as const,
        transition: "all 0.2s",
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
        {icon}
      </span>
      {label}
    </button>
  );
}

/* ─────────────────────────────────────────
   MAIN DASHBOARD
───────────────────────────────────────── */
export default function Dashboard() {
  const navigate = useNavigate();
  const backend = import.meta.env.VITE_BACKEND_URL;

  const [currentPlan, setCurrentPlan] = useState<PlanName | "">("");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<PlanName | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("portfolio");

  const triggerAlerts = useSelector((s: RootState) => s.alerts.queue);
  const prices = useSelector((state: RootState) => state.market);

  

  useEffect(() => {
    if (!triggerAlerts.length) return;
    const ids = triggerAlerts.map((a: any) => a.alertId);
    setAlerts((prev) =>
      prev.map((a) => (ids.includes(a.id) ? { ...a, status: "TRIGGERED" } : a)),
    );
  }, [triggerAlerts]);

  /* modals */
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [showCreateAlert, setShowCreateAlert] = useState(false);
  const [showEditAlert, setShowEditAlert] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [targetAlert, setTargetAlert] = useState<Alert | null>(null);

  /* forms */
  const [accountName, setAccountName] = useState("");
  const [accountBalance, setAccountBalance] = useState("");
  const [alertName, setAlertName] = useState("");
  const [alertPrice, setAlertPrice] = useState("");
  const [alertType, setAlertType] = useState<AlertType>("GTE");
  const [alertSymbol, setAlertSymbol] = useState("BTCUSD");

  /* error states */
  const [accountError, setAccountError] = useState("");
  const [alertError, setAlertError] = useState("");

  const resetAlertForm = () => {
    setAlertName("");
    setAlertPrice("");
    setAlertType("GTE");
    setAlertSymbol("BTCUSD");
    setAlertError("");
  };

  /* ── API ── */
  const fetchAlerts = async () => {
    try {
      const res = await axios.get(`${backend}/alerts`, {
        withCredentials: true,
      });
      setAlerts(res.data.success ? (res.data.data ?? []) : []);
    } catch {
      setAlerts([]);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await axios.get(`${backend}/accounts`, {
        withCredentials: true,
      });
      if (res.data.success) setAccounts(res.data.data ?? []);
    } catch {
      setAccounts([]);
    }
    try {
      const sub = await axios.get(`${backend}/subscriptions`, {
        withCredentials: true,
      });
      if (sub.data.success) setCurrentPlan(sub.data.data.name);
    } catch {}
  };

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const res = await axios.get(`${backend}/auth/user`, {
          withCredentials: true,
        });

       
        if (!res.data.success) {
          navigate("/signin");
          return;
        }
        if (mounted) setUser(res.data.data);
        await Promise.all([fetchAccounts(), fetchAlerts()]);
      } catch {
        navigate("/signin");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    init();
    return () => {
      mounted = false;
    };
  }, []);

  /* ── Account CRUD ── */
  const handleCreateAccount = async () => {
    if (!accountName.trim()) {
      setAccountError("Account name is required.");
      return;
    }
    if (!accountBalance || isNaN(parseFloat(accountBalance))) {
      setAccountError("Enter a valid balance.");
      return;
    }
    setAccountError("");
    try {
      const res = await axios.post(
        `${backend}/accounts`,
        { name: accountName, balance: parseFloat(accountBalance) },
        { withCredentials: true },
      );
      if (res.data.success) {
        setAccounts((p) => [...p, res.data.data]);
        setAccountName("");
        setAccountBalance("");
        setShowCreateAccount(false);
      }
    } catch {
      setAccountError("Failed to create account. Try again.");
    }
  };

  const handleDeleteAccount = async (id: string) => {
    try {
      const res = await axios.delete(`${backend}/accounts/${id}`, {
        withCredentials: true,
      });
      if (res.data.success) setAccounts((p) => p.filter((a) => a.id !== id));
    } catch {}
  };

  /* ── Alert CRUD ── */
  const handleCreateAlert = async () => {
    if (!alertName.trim()) {
      setAlertError("Alert name is required.");
      return;
    }
    if (!alertPrice || isNaN(parseFloat(alertPrice))) {
      setAlertError("Enter a valid price.");
      return;
    }
    setAlertError("");
    try {
      const res = await axios.post(
        `${backend}/alerts`,
        {
          name: alertName,
          price: parseFloat(alertPrice),
          type: alertType,
          symbol: alertSymbol,
        },
        { withCredentials: true },
      );
      if (res.data.success) {
        setAlerts((p) => [...p, res.data.data]);
        resetAlertForm();
        setShowCreateAlert(false);
      }
    } catch {
      setAlertError("Failed to create alert. Try again.");
    }
  };

  const openEditAlert = (a: Alert) => {
    setTargetAlert(a);
    setAlertName(a.name);
    setAlertPrice(String(a.price));
    setAlertType(a.type);
    setAlertSymbol(a.symbol);
    setAlertError("");
    setShowEditAlert(true);
  };

  const handleEditAlert = async () => {
    if (!targetAlert || !alertName.trim() || !alertPrice) {
      setAlertError("All fields required.");
      return;
    }
    setAlertError("");
    try {
      const res = await axios.patch(
        `${backend}/alerts/${targetAlert.id}`,
        {
          name: alertName,
          price: parseFloat(alertPrice),
          type: alertType,
          symbol: alertSymbol,
        },
        { withCredentials: true },
      );
      if (res.data.success) {
        setAlerts((p) =>
          p.map((a) => (a.id === targetAlert.id ? res.data.data : a)),
        );
        resetAlertForm();
        setShowEditAlert(false);
        setTargetAlert(null);
      }
    } catch {
      setAlertError("Failed to update alert. Try again.");
    }
  };

  const openDeleteAlert = (a: Alert) => {
    setTargetAlert(a);
    setShowDeleteAlert(true);
  };

  const handleDeleteAlert = async () => {
    if (!targetAlert) return;
    try {
      const res = await axios.delete(`${backend}/alerts/${targetAlert.id}`, {
        withCredentials: true,
      });
      if (res.data.success) {
        setAlerts((p) => p.filter((a) => a.id !== targetAlert.id));
        setShowDeleteAlert(false);
        setTargetAlert(null);
      }
    } catch {}
  };

  /* ── Upgrade ── */
  const handleUpgrade = async (plan: PlanName) => {
    try {
      setLoadingPlan(plan);
      const { data } = await axios.post(
        `${backend}/subscriptions/upgrade`,
        { planName: plan },
        { withCredentials: true },
      );
      const razor = new (window as any).Razorpay({
        key: data.key,
        amount: data.amount,
        currency: data.currency,
        order_id: data.orderId,
        name: "WiseFox",
        description: `Upgrade to ${plan}`,
        handler: () => {
          alert("Payment successful! Plan updating...");
          window.location.reload();
        },
        theme: { color: "#25b317" },
      });
      razor.open();
    } catch {
      alert("Upgrade failed");
    } finally {
      setLoadingPlan(null);
    }
  };

  /* ── Ticker items ── */
  const tickerItems = [
    { k: "24H VOL", v: "$38.2B" },
    { k: "BTC DOM", v: "52.4%" },
    { k: "FEAR/GREED", v: "72 — Greed" },
    { k: "OPEN INT", v: "$12.8B" },
    { k: "FUNDING", v: "+0.01%" },
    { k: "LONGS/SHORTS", v: "54% / 46%" },
  ];

  /* ── Loading ── */
  if (!user && loading) {
    return (
      <>
        <style>{GLOBAL_CSS}</style>
        <div
          style={{
            minHeight: "100vh",
            background: "#050505",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "14px",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              border: "2px solid rgba(37,179,23,0.2)",
              borderTop: "2px solid #25b317",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "12px",
              color: "#879580",
              letterSpacing: "2px",
            }}
          >
            CONNECTING…
          </span>
        </div>
      </>
    );
  }

  const planColor =
    { BASIC: "#879580", PRO: "#5be146", PREMIUM: "#25b317" }[
      currentPlan as string
    ] || "#879580";

  /* ─────────────────────────────────────────
     RENDER
  ───────────────────────────────────────── */
  return (
    <>
      <style>{GLOBAL_CSS}</style>

      {/* MOBILE HEADER */}
      <header
        className="mobile-header"
        style={{
          display: "none",
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          height: "56px",
          background: "#121212",
          borderBottom: "1px solid #1c1b1b",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: 28,
              height: 28,
              background: "#25b317",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "16px", color: "#023a00" }}
            >
              diamond
            </span>
          </div>
          <span
            style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: "16px",
              fontWeight: 800,
              color: "#25b317",
            }}
          >
            WiseFox
          </span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#879580",
          }}
        >
          <span className="material-symbols-outlined">
            {mobileMenuOpen ? "close" : "menu"}
          </span>
        </button>
      </header>

      {/* MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div
          className="anim-fade-in"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(8px)",
          }}
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              top: 56,
              left: 0,
              bottom: 0,
              width: 260,
              background: "#121212",
              borderRight: "1px solid #1c1b1b",
              padding: "16px 0",
            }}
          >
            {[
              { icon: "grid_view", label: "Terminal", id: "terminal" },
              { icon: "account_balance", label: "Portfolio", id: "portfolio" },
              { icon: "monitoring", label: "Analytics", id: "analytics" },
              { icon: "query_stats", label: "Markets", id: "markets" },
              { icon: "star", label: "Watchlist", id: "watchlist" },
            ].map((n) => (
              <NavItem
                key={n.id}
                icon={n.icon}
                label={n.label}
                active={activeNav === n.id}
                onClick={() => {
                  setActiveNav(n.id);
                  setMobileMenuOpen(false);
                }}
              />
            ))}
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          height: "100vh",
          overflow: "hidden",
          background: "#050505",
        }}
      >
        {/* ── SIDEBAR ── */}
        <aside
          className="sidebar-desktop"
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            height: "100vh",
            width: "240px",
            background: "#121212",
            borderRight: "1px solid #1c1b1b",
            display: "flex",
            flexDirection: "column",
            zIndex: 50,
            padding: "24px 0",
            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          {/* Logo */}
          <div
            style={{
              padding: "0 20px",
              marginBottom: "32px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                background: "#25b317",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: "18px",
                  color: "#023a00",
                  fontVariationSettings: "'FILL' 1",
                }}
              >
                diamond
              </span>
            </div>
            <div>
              <div
                style={{
                  fontFamily: "'Manrope', sans-serif",
                  fontSize: "15px",
                  fontWeight: 800,
                  color: "#25b317",
                  letterSpacing: "-0.3px",
                }}
              >
                WiseFox
              </div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "9px",
                  color: "#3e4a39",
                  letterSpacing: "1.5px",
                  textTransform: "uppercase" as const,
                }}
              >
                Elite Terminal
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1 }}>
            {[
              { icon: "grid_view", label: "Terminal", id: "terminal" },
              { icon: "account_balance", label: "Portfolio", id: "portfolio" },
              { icon: "monitoring", label: "Analytics", id: "analytics" },
              { icon: "query_stats", label: "Markets", id: "markets" },
              { icon: "star", label: "Watchlist", id: "watchlist" },
              { icon: "settings", label: "Settings", id: "settings" },
            ].map((n) => (
              <NavItem
                key={n.id}
                icon={n.icon}
                label={n.label}
                active={activeNav === n.id}
                onClick={() => setActiveNav(n.id)}
              />
            ))}
          </nav>

          {/* Plan badge */}
          <div style={{ padding: "0 16px", marginBottom: "16px" }}>
            <div
              style={{
                background: "rgba(37,179,23,0.04)",
                border: "1px solid rgba(37,179,23,0.12)",
                borderRadius: "8px",
                padding: "10px 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "9px",
                    color: "#879580",
                    letterSpacing: "1px",
                    marginBottom: "2px",
                  }}
                >
                  CURRENT PLAN
                </div>
                <div
                  style={{
                    fontFamily: "'Manrope', sans-serif",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: planColor,
                  }}
                >
                  {currentPlan || "—"}
                </div>
              </div>
              {currentPlan !== "PREMIUM" && (
                <button
                  className="btn-primary"
                  onClick={() => setShowUpgrade(true)}
                  style={{
                    background: "#25b317",
                    color: "#023a00",
                    fontFamily: "'Manrope', sans-serif",
                    fontSize: "9px",
                    fontWeight: 800,
                    letterSpacing: "1px",
                    textTransform: "uppercase" as const,
                    padding: "6px 10px",
                    borderRadius: "5px",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Up↑
                </button>
              )}
            </div>
          </div>

          {/* Bottom actions */}
          <div
            style={{
              padding: "0 16px",
              borderTop: "1px solid #1c1b1b",
              paddingTop: "16px",
            }}
          >
            <button
              onClick={() => navigate("/")}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 12px",
                background: "rgba(179,37,23,0.06)",
                border: "1px solid rgba(179,37,23,0.15)",
                borderRadius: "8px",
                color: "#fc8181",
                fontFamily: "'Manrope', sans-serif",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
                letterSpacing: "0.5px",
                transition: "all 0.2s",
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "16px" }}
              >
                logout
              </span>
              Sign Out
            </button>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <main
          className="main-content"
          style={{
            marginLeft: "240px",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            height: "100vh",
            overflow: "hidden",
          }}
        >
          {/* TOP BAR */}
          <header
            style={{
              position: "sticky",
              top: 0,
              zIndex: 40,
              background: "rgba(5,5,5,0.92)",
              backdropFilter: "blur(16px)",
              borderBottom: "1px solid #1c1b1b",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 28px",
              height: "60px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              <span
                style={{
                  fontFamily: "'Manrope', sans-serif",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#e5e2e1",
                  letterSpacing: "-0.2px",
                }}
              >
                Portfolio Dashboard
              </span>
              <div
                style={{ width: "1px", height: "16px", background: "#1c1b1b" }}
              />
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "11px",
                  color: "#879580",
                }}
              >
                {user?.email}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  background: "#1c1b1b",
                  border: "1px solid rgba(255,255,255,0.04)",
                  borderRadius: "8px",
                  padding: "6px 12px",
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "14px", color: "#879580" }}
                >
                  person
                </span>
                <span
                  style={{
                    fontFamily: "'Manrope', sans-serif",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#bdcbb4",
                  }}
                >
                  {user?.name || "User"}
                </span>
              </div>
              <button
                className="btn-primary"
                style={{
                  background: "#25b317",
                  color: "#023a00",
                  fontFamily: "'Manrope', sans-serif",
                  fontSize: "11px",
                  fontWeight: 800,
                  letterSpacing: "1px",
                  textTransform: "uppercase" as const,
                  padding: "8px 16px",
                  borderRadius: "7px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Execute Trade
              </button>
            </div>
          </header>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              overflowX: "hidden",
              padding: "24px 28px",
              paddingTop: "20px",
            }}
          >
            {/* TICKER */}
            <div
              style={{
                background: "#121212",
                border: "1px solid #1c1b1b",
                borderRadius: "8px",
                padding: "10px 0",
                marginBottom: "24px",
                overflow: "hidden",
              }}
            >
              <div className="ticker-wrap">
                <div className="ticker-inner">
                  {[...tickerItems, ...tickerItems].map((item, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        whiteSpace: "nowrap" as const,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: "10px",
                          color: "#879580",
                          letterSpacing: "1px",
                        }}
                      >
                        {item.k}
                      </span>
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: "10px",
                          color: "#5be146",
                          fontWeight: 600,
                        }}
                      >
                        {item.v}
                      </span>
                      <span style={{ color: "#1c1b1b", marginLeft: "8px" }}>
                        |
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* PRICE CARDS */}
            <div
              className="grid-2col"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
                marginBottom: "24px",
              }}
            >
              {loading ? (
                <>
                  <PriceCardSkeleton />
                  <PriceCardSkeleton />
                </>
              ) : (
                <>
                  <PriceCard
                    symbol="BTC / USD"
                    price={Math.round(prices.BTCUSD)}
                    change="+2.34%"
                    icon="₿"
                    accent="#F7931A"
                  />
                  <PriceCard
                    symbol="XAU / USD"
                    price={Math.round(prices.PAXGUSD)}
                    change="+0.76%"
                    icon="✦"
                    accent="#FFD700"
                  />
                </>
              )}
            </div>

            {/* MAIN PANELS */}
            <div
              className="grid-2col"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "20px",
              }}
            >
              {/* ALERTS PANEL */}
              <div
                style={{
                  background: "linear-gradient(180deg,#121212 0%,#0e0e0e 100%)",
                  border: "1px solid rgba(37,179,23,0.08)",
                  borderRadius: "12px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "18px 20px",
                    borderBottom: "1px solid #1c1b1b",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "16px", color: "#25b317" }}
                    >
                      notifications_active
                    </span>
                    <span
                      style={{
                        fontFamily: "'Manrope', sans-serif",
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#bdcbb4",
                        letterSpacing: "1px",
                        textTransform: "uppercase" as const,
                      }}
                    >
                      Active Alerts
                    </span>
                    {!loading && (
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: "10px",
                          background: "rgba(37,179,23,0.12)",
                          color: "#25b317",
                          padding: "2px 7px",
                          borderRadius: "4px",
                          border: "1px solid rgba(37,179,23,0.2)",
                        }}
                      >
                        {alerts.length}
                      </span>
                    )}
                  </div>
                  <button
                    className="btn-primary"
                    onClick={() => {
                      resetAlertForm();
                      setShowCreateAlert(true);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      background: "rgba(37,179,23,0.1)",
                      color: "#25b317",
                      border: "1px solid rgba(37,179,23,0.2)",
                      borderRadius: "7px",
                      padding: "7px 12px",
                      fontFamily: "'Manrope', sans-serif",
                      fontSize: "11px",
                      fontWeight: 700,
                      cursor: "pointer",
                      letterSpacing: "0.3px",
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "14px" }}
                    >
                      add
                    </span>
                    New Alert
                  </button>
                </div>
                <div
                  style={{
                    padding: "14px 16px",
                    maxHeight: "340px",
                    overflowY: "auto",
                  }}
                >
                  {loading ? (
                    <>
                      {[0, 1, 2].map((i) => (
                        <AlertRowSkeleton key={i} />
                      ))}
                    </>
                  ) : alerts.length === 0 ? (
                    <EmptyState
                      icon="notifications_off"
                      label="No active alerts"
                      sublabel="Create your first price alert above"
                    />
                  ) : (
                    alerts.map((a, i) => (
                      <div
                        key={a.id}
                        className="list-row anim-fade-up"
                        style={{
                          animationDelay: `${i * 0.05}s`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "12px 14px",
                          background: "#1c1b1b",
                          border: "1px solid rgba(255,255,255,0.04)",
                          borderRadius: "10px",
                          marginBottom: "8px",
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontFamily: "'Manrope', sans-serif",
                              fontSize: "13px",
                              fontWeight: 600,
                              color: "#e5e2e1",
                              marginBottom: "6px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap" as const,
                            }}
                          >
                            {a.name}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "5px",
                              flexWrap: "wrap" as const,
                            }}
                          >
                            <Badge variant="blue">{a.symbol}</Badge>
                            <Badge variant={a.type === "GTE" ? "green" : "red"}>
                              {a.type === "GTE" ? "≥ Above" : "≤ Below"}
                            </Badge>
                            <Badge
                              variant={
                                a.status === "TRIGGERED" ? "green" : "blue"
                              }
                            >
                              {a.status}
                            </Badge>
                            <span
                              style={{
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: "10px",
                                color: "#879580",
                              }}
                            >
                              ${Number(a.price).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: "6px",
                            marginLeft: "10px",
                            flexShrink: 0,
                          }}
                        >
                          <button
                            onClick={() => openEditAlert(a)}
                            title="Edit"
                            style={{
                              width: 30,
                              height: 30,
                              background: "rgba(91,225,70,0.08)",
                              border: "1px solid rgba(91,225,70,0.15)",
                              borderRadius: "7px",
                              color: "#5be146",
                              cursor: "pointer",
                              fontSize: "14px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "all 0.2s",
                            }}
                          >
                            <span
                              className="material-symbols-outlined"
                              style={{ fontSize: "14px" }}
                            >
                              edit
                            </span>
                          </button>
                          <button
                            onClick={() => openDeleteAlert(a)}
                            title="Delete"
                            style={{
                              width: 30,
                              height: 30,
                              background: "rgba(179,37,23,0.08)",
                              border: "1px solid rgba(179,37,23,0.15)",
                              borderRadius: "7px",
                              color: "#fc8181",
                              cursor: "pointer",
                              fontSize: "14px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "all 0.2s",
                            }}
                          >
                            <span
                              className="material-symbols-outlined"
                              style={{ fontSize: "14px" }}
                            >
                              delete
                            </span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* ACCOUNTS PANEL */}
              <div
                style={{
                  background: "linear-gradient(180deg,#121212 0%,#0e0e0e 100%)",
                  border: "1px solid rgba(37,179,23,0.08)",
                  borderRadius: "12px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "18px 20px",
                    borderBottom: "1px solid #1c1b1b",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "16px", color: "#25b317" }}
                    >
                      account_balance
                    </span>
                    <span
                      style={{
                        fontFamily: "'Manrope', sans-serif",
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#bdcbb4",
                        letterSpacing: "1px",
                        textTransform: "uppercase" as const,
                      }}
                    >
                      Accounts
                    </span>
                    {!loading && (
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: "10px",
                          background: "rgba(37,179,23,0.12)",
                          color: "#25b317",
                          padding: "2px 7px",
                          borderRadius: "4px",
                          border: "1px solid rgba(37,179,23,0.2)",
                        }}
                      >
                        {accounts.length}
                      </span>
                    )}
                  </div>
                  <button
                    className="btn-primary"
                    onClick={() => setShowCreateAccount(true)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      background: "rgba(37,179,23,0.1)",
                      color: "#25b317",
                      border: "1px solid rgba(37,179,23,0.2)",
                      borderRadius: "7px",
                      padding: "7px 12px",
                      fontFamily: "'Manrope', sans-serif",
                      fontSize: "11px",
                      fontWeight: 700,
                      cursor: "pointer",
                      letterSpacing: "0.3px",
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "14px" }}
                    >
                      add
                    </span>
                    New Account
                  </button>
                </div>
                <div
                  style={{
                    padding: "14px 16px",
                    maxHeight: "340px",
                    overflowY: "auto",
                  }}
                >
                  {loading ? (
                    <>
                      {[0, 1, 2].map((i) => (
                        <AlertRowSkeleton key={i} />
                      ))}
                    </>
                  ) : accounts.length === 0 ? (
                    <EmptyState
                      icon="account_balance_wallet"
                      label="No accounts yet"
                      sublabel="Create your first trading account above"
                    />
                  ) : (
                    accounts.map((acc, i) => (
                      <div
                        key={acc.id}
                        className="list-row anim-fade-up"
                        style={{
                          animationDelay: `${i * 0.05}s`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "14px 16px",
                          background: "#1c1b1b",
                          border: "1px solid rgba(255,255,255,0.04)",
                          borderRadius: "10px",
                          marginBottom: "8px",
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontFamily: "'Manrope', sans-serif",
                              fontSize: "13px",
                              fontWeight: 600,
                              color: "#e5e2e1",
                              marginBottom: "4px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap" as const,
                            }}
                          >
                            {acc.name}
                          </div>
                          <div
                            style={{
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: "13px",
                              color: "#25b317",
                              fontWeight: 600,
                            }}
                          >
                            $
                            {Number(acc.balance).toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                            })}
                          </div>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: "6px",
                            marginLeft: "10px",
                            flexShrink: 0,
                          }}
                        >
                          <button
                            onClick={() => navigate(`/accounts/${acc.id}`)}
                            style={{
                              padding: "6px 12px",
                              background: "rgba(91,225,70,0.08)",
                              border: "1px solid rgba(91,225,70,0.15)",
                              borderRadius: "7px",
                              color: "#5be146",
                              cursor: "pointer",
                              fontFamily: "'Manrope', sans-serif",
                              fontSize: "11px",
                              fontWeight: 700,
                              letterSpacing: "0.3px",
                              transition: "all 0.2s",
                            }}
                          >
                            Trade
                          </button>
                          <button
                            onClick={() => handleDeleteAccount(acc.id)}
                            style={{
                              width: 30,
                              height: 30,
                              background: "rgba(179,37,23,0.08)",
                              border: "1px solid rgba(179,37,23,0.15)",
                              borderRadius: "7px",
                              color: "#fc8181",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "all 0.2s",
                            }}
                          >
                            <span
                              className="material-symbols-outlined"
                              style={{ fontSize: "14px" }}
                            >
                              delete
                            </span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ═══════ MODAL: CREATE ACCOUNT ═══════ */}
      <Modal
        open={showCreateAccount}
        onClose={() => {
          setShowCreateAccount(false);
          setAccountError("");
        }}
        title="New Account"
      >
        <FormGroup label="Account Name">
          <input
            style={inputStyle}
            placeholder="e.g. Main Trading"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateAccount()}
          />
        </FormGroup>
        <FormGroup label="Starting Balance (USD)">
          <input
            style={inputStyle}
            type="number"
            placeholder="e.g. 10000"
            value={accountBalance}
            onChange={(e) => setAccountBalance(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateAccount()}
          />
        </FormGroup>
        {accountError && (
          <div
            style={{
              marginBottom: "12px",
              padding: "10px 14px",
              background: "rgba(179,37,23,0.08)",
              border: "1px solid rgba(179,37,23,0.2)",
              borderRadius: "8px",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "11px",
              color: "#fc8181",
            }}
          >
            ⚠ {accountError}
          </div>
        )}
        <button
          className="btn-primary"
          onClick={handleCreateAccount}
          style={{
            width: "100%",
            padding: "13px",
            background: "#25b317",
            color: "#023a00",
            border: "none",
            borderRadius: "9px",
            fontFamily: "'Manrope', sans-serif",
            fontSize: "13px",
            fontWeight: 800,
            cursor: "pointer",
            letterSpacing: "0.5px",
            marginTop: "4px",
          }}
        >
          Create Account
        </button>
      </Modal>

      {/* ═══════ MODAL: CREATE ALERT ═══════ */}
      <Modal
        open={showCreateAlert}
        onClose={() => {
          setShowCreateAlert(false);
          resetAlertForm();
        }}
        title="New Price Alert"
      >
        <FormGroup label="Alert Name">
          <input
            style={inputStyle}
            placeholder="e.g. BTC Moon Watch"
            value={alertName}
            onChange={(e) => setAlertName(e.target.value)}
          />
        </FormGroup>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
          }}
        >
          <FormGroup label="Symbol">
            <select
              style={inputStyle}
              value={alertSymbol}
              onChange={(e) => setAlertSymbol(e.target.value)}
            >
              <option value="BTCUSD">BTCUSD</option>
              <option value="PAXGUSD">XAUUSD</option>
            </select>
          </FormGroup>
          <FormGroup label="Condition">
            <select
              style={inputStyle}
              value={alertType}
              onChange={(e) => setAlertType(e.target.value as AlertType)}
            >
              <option value="GTE">≥ Above</option>
              <option value="LTE">≤ Below</option>
            </select>
          </FormGroup>
        </div>
        <FormGroup label="Trigger Price (USD)">
          <input
            style={inputStyle}
            type="number"
            placeholder="e.g. 70000"
            value={alertPrice}
            onChange={(e) => setAlertPrice(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateAlert()}
          />
        </FormGroup>
        {alertError && (
          <div
            style={{
              marginBottom: "12px",
              padding: "10px 14px",
              background: "rgba(179,37,23,0.08)",
              border: "1px solid rgba(179,37,23,0.2)",
              borderRadius: "8px",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "11px",
              color: "#fc8181",
            }}
          >
            ⚠ {alertError}
          </div>
        )}
        <button
          className="btn-primary"
          onClick={handleCreateAlert}
          style={{
            width: "100%",
            padding: "13px",
            background: "#25b317",
            color: "#023a00",
            border: "none",
            borderRadius: "9px",
            fontFamily: "'Manrope', sans-serif",
            fontSize: "13px",
            fontWeight: 800,
            cursor: "pointer",
            letterSpacing: "0.5px",
            marginTop: "4px",
          }}
        >
          Create Alert
        </button>
      </Modal>

      {/* ═══════ MODAL: EDIT ALERT ═══════ */}
      <Modal
        open={showEditAlert}
        onClose={() => {
          setShowEditAlert(false);
          setTargetAlert(null);
          resetAlertForm();
        }}
        title="Edit Alert"
      >
        <FormGroup label="Alert Name">
          <input
            style={inputStyle}
            placeholder="e.g. BTC Moon Watch"
            value={alertName}
            onChange={(e) => setAlertName(e.target.value)}
          />
        </FormGroup>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
          }}
        >
          <FormGroup label="Symbol">
            <select
              style={inputStyle}
              value={alertSymbol}
              onChange={(e) => setAlertSymbol(e.target.value)}
            >
              <option value="BTCUSD">BTCUSD</option>
              <option value="PAXGUSD">XAUUSD</option>
            </select>
          </FormGroup>
          <FormGroup label="Condition">
            <select
              style={inputStyle}
              value={alertType}
              onChange={(e) => setAlertType(e.target.value as AlertType)}
            >
              <option value="GTE">≥ Above</option>
              <option value="LTE">≤ Below</option>
            </select>
          </FormGroup>
        </div>
        <FormGroup label="Trigger Price (USD)">
          <input
            style={inputStyle}
            type="number"
            placeholder="e.g. 70000"
            value={alertPrice}
            onChange={(e) => setAlertPrice(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleEditAlert()}
          />
        </FormGroup>
        {alertError && (
          <div
            style={{
              marginBottom: "12px",
              padding: "10px 14px",
              background: "rgba(179,37,23,0.08)",
              border: "1px solid rgba(179,37,23,0.2)",
              borderRadius: "8px",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "11px",
              color: "#fc8181",
            }}
          >
            ⚠ {alertError}
          </div>
        )}
        <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
          <button
            className="btn-primary"
            onClick={handleEditAlert}
            style={{
              flex: 1,
              padding: "13px",
              background: "#25b317",
              color: "#023a00",
              border: "none",
              borderRadius: "9px",
              fontFamily: "'Manrope', sans-serif",
              fontSize: "13px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Save Changes
          </button>
          <button
            onClick={() => {
              setShowEditAlert(false);
              setTargetAlert(null);
              resetAlertForm();
            }}
            style={{
              padding: "13px 18px",
              background: "#1c1b1b",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "9px",
              color: "#879580",
              fontFamily: "'Manrope', sans-serif",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            Cancel
          </button>
        </div>
      </Modal>

      {/* ═══════ MODAL: DELETE ALERT ═══════ */}
      <Modal
        open={showDeleteAlert}
        onClose={() => {
          setShowDeleteAlert(false);
          setTargetAlert(null);
        }}
        title="Delete Alert"
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column" as const,
            alignItems: "center",
            padding: "8px 0 20px",
            textAlign: "center" as const,
            gap: "14px",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "rgba(179,37,23,0.1)",
              border: "1px solid rgba(179,37,23,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "24px", color: "#fc8181" }}
            >
              warning
            </span>
          </div>
          <div>
            <p
              style={{
                fontFamily: "'Manrope', sans-serif",
                fontSize: "14px",
                color: "#bdcbb4",
                lineHeight: 1.7,
                marginBottom: "4px",
              }}
            >
              Delete{" "}
              <strong style={{ color: "#e5e2e1" }}>{targetAlert?.name}</strong>?
            </p>
            <p
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "11px",
                color: "#879580",
              }}
            >
              This action cannot be undone.
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={handleDeleteAlert}
            style={{
              flex: 1,
              padding: "13px",
              background: "linear-gradient(135deg,#fc8181,#e53e3e)",
              color: "#fff",
              border: "none",
              borderRadius: "9px",
              fontFamily: "'Manrope', sans-serif",
              fontSize: "13px",
              fontWeight: 800,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            Yes, Delete
          </button>
          <button
            onClick={() => {
              setShowDeleteAlert(false);
              setTargetAlert(null);
            }}
            style={{
              flex: 1,
              padding: "13px",
              background: "#1c1b1b",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "9px",
              color: "#879580",
              fontFamily: "'Manrope', sans-serif",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </Modal>

      {/* ═══════ MODAL: UPGRADE ═══════ */}
      <Modal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        title="Upgrade Plan"
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column" as const,
            gap: "12px",
          }}
        >
          {[
            {
              name: "BASIC" as PlanName,
              price: "Free",
              features: ["3 trades/day", "1 journal/day", "1 account"],
              accent: "#879580",
            },
            {
              name: "PRO" as PlanName,
              price: "₹999/mo",
              features: [
                "10 trades/day",
                "3 journals/day",
                "3 accounts",
                "AI summary",
              ],
              accent: "#5be146",
            },
            {
              name: "PREMIUM" as PlanName,
              price: "₹1999/mo",
              features: [
                "Unlimited trades",
                "Unlimited everything",
                "Full AI access",
              ],
              accent: "#25b317",
            },
          ].map((plan) => {
            const isCurrent = plan.name === currentPlan;
            const isDisabled =
              isCurrent || (currentPlan === "PRO" && plan.name === "BASIC");
            return (
              <div
                key={plan.name}
                style={{
                  background: isCurrent ? "rgba(37,179,23,0.04)" : "#1c1b1b",
                  border: `1px solid ${isCurrent ? "rgba(37,179,23,0.25)" : "rgba(255,255,255,0.04)"}`,
                  borderRadius: "10px",
                  padding: "16px",
                  transition: "all 0.2s",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "10px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: "'Manrope', sans-serif",
                        fontSize: "14px",
                        fontWeight: 800,
                        color: plan.accent,
                        marginBottom: "2px",
                      }}
                    >
                      {plan.name}
                    </div>
                    <div
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: "12px",
                        color: "#879580",
                      }}
                    >
                      {plan.price}
                    </div>
                  </div>
                  {isCurrent && <Badge variant="green">Current</Badge>}
                </div>
                <ul style={{ marginBottom: "12px" }}>
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      style={{
                        fontFamily: "'Manrope', sans-serif",
                        fontSize: "12px",
                        color: "#bdcbb4",
                        marginBottom: "4px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: "12px", color: plan.accent }}
                      >
                        check_circle
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  disabled={isDisabled || loadingPlan === plan.name}
                  onClick={() => handleUpgrade(plan.name)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "none",
                    cursor: isDisabled ? "not-allowed" : "pointer",
                    background: isDisabled
                      ? "rgba(255,255,255,0.04)"
                      : `linear-gradient(135deg,${plan.accent},${plan.accent}cc)`,
                    color: isDisabled ? "#3e4a39" : "#023a00",
                    fontFamily: "'Manrope', sans-serif",
                    fontWeight: 700,
                    fontSize: "12px",
                    letterSpacing: "0.5px",
                    transition: "all 0.2s",
                  }}
                >
                  {isDisabled
                    ? "Current Plan"
                    : loadingPlan === plan.name
                      ? "Processing…"
                      : `Upgrade to ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>
      </Modal>
    </>
  );
}
