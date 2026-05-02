import axios from "axios";
import { useEffect, useState } from "react";
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

/* ─────────────────────────────────────────
   SMALL COMPONENTS
───────────────────────────────────────── */

function PriceCard({
  symbol,
  price,
  change,
  color,
}: {
  symbol: string;
  price: number;
  change: string;
  color: "btc" | "xau";
}) {
  const dotColor = color === "btc" ? "#F7931A" : "#FFD700";
  return (
    <div style={styles.priceCard}>
      <div
        style={{
          ...styles.priceCardGlow,
          background: dotColor,
        }}
      />
      <div style={styles.priceLabel}>
        <span
          style={{
            ...styles.priceDot,
            background: dotColor,
          }}
        />
        {symbol}
      </div>
      <div style={styles.priceValue}>${price.toLocaleString()}</div>
      <div style={styles.priceChange}>{change} · Live</div>
    </div>
  );
}

function Badge({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant: "blue" | "green" | "red";
}) {
  const map = {
    blue: { background: "rgba(99,179,237,0.12)", color: "#63B3ED" },
    green: { background: "rgba(72,187,120,0.12)", color: "#48BB78" },
    red: { background: "rgba(252,129,129,0.12)", color: "#FC8181" },
  };
  return <span style={{ ...styles.badge, ...map[variant] }}>{children}</span>;
}

function EmptyState({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={styles.emptyState}>
      <div style={styles.emptyIcon}>{icon}</div>
      {label}
    </div>
  );
}

/* ─────────────────────────────────────────
   MODAL WRAPPER
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
  // close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <div
      style={{
        ...styles.overlay,
        opacity: open ? 1 : 0,
        pointerEvents: open ? "all" : "none",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          ...styles.modal,
          transform: open
            ? "translateY(0) scale(1)"
            : "translateY(24px) scale(0.96)",
          transition: "transform 0.3s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        <div style={styles.modalHeader}>
          <span style={styles.modalTitle}>{title}</span>
          <button style={styles.modalClose} onClick={onClose}>
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
    <div style={{ marginBottom: 16 }}>
      <label style={styles.formLabel}>{label}</label>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN DASHBOARD
───────────────────────────────────────── */

function Dashboard() {
  const navigate = useNavigate();
  const backend = import.meta.env.VITE_BACKEND_URL;

  /* state */
  const [user, setUser] = useState<User | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const triggerAlerts = useSelector((s: RootState) => s.alerts.queue);

  useEffect(() => {
    if (!triggerAlerts.length) return;

    const triggeredIds = triggerAlerts.map((a) => a.alertId);

    setAlerts((prev) =>
      prev.map((alert) =>
        triggeredIds.includes(alert.id)
          ? { ...alert, status: "TRIGGERED" }
          : alert,
      ),
    );
  }, [triggerAlerts]);

  /* modal visibility */
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [showCreateAlert, setShowCreateAlert] = useState(false);
  const [showEditAlert, setShowEditAlert] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  /* form state – account */
  const [accountName, setAccountName] = useState("");
  const [accountBalance, setAccountBalance] = useState("");

  /* form state – alert (shared for create + edit) */
  const [alertName, setAlertName] = useState("");
  const [alertPrice, setAlertPrice] = useState("");
  const [alertType, setAlertType] = useState<AlertType>("GTE");
  const [alertSymbol, setAlertSymbol] = useState("BTCUSD");

  /* currently targeted alert for edit/delete */
  const [targetAlert, setTargetAlert] = useState<Alert | null>(null);

  /* simulated live prices (replace with Redux selector) */
  const prices = useSelector((state: RootState) => state.market);

  /* ── API helpers ── */

  const fetchAlerts = async () => {
    try {
      const res = await axios.get(`${backend}/alerts`, {
        withCredentials: true,
      });
      if (res.data.success) setAlerts(res.data.data ?? []);
      else setAlerts([]);
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
  };

  /* ── auth init ── */
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
        await fetchAccounts();
        await fetchAlerts();
      } catch {
        navigate("/signin");
      }
    };
    init();
    return () => {
      mounted = false;
    };
  }, []);

  /* ── account CRUD ── */

  const handleCreateAccount = async () => {
    if (!accountName.trim() || !accountBalance) return;
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
    } catch (err) {
      console.error("Create account failed:", err);
    }
  };

  const handleDeleteAccount = async (alertId: string) => {
    try {
      const res = await axios.delete(`${backend}/accounts/${alertId}`, {
        withCredentials: true,
      });
      if (res.data.success)
        setAccounts((p) => p.filter((a) => a.id !== alertId));
    } catch (err) {
      console.error("Delete account failed:", err);
    }
  };

  /* ── alert CRUD ── */

  const handleCreateAlert = async () => {
    if (!alertName.trim() || !alertPrice) return;
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
    } catch (err) {
      console.error("Create alert failed:", err);
    }
  };

  const openEditAlert = (alert: Alert) => {
    setTargetAlert(alert);
    setAlertName(alert.name);
    setAlertPrice(String(alert.price));
    setAlertType(alert.type);
    setAlertSymbol(alert.symbol);
    setShowEditAlert(true);
  };

  const handleEditAlert = async () => {
    if (!targetAlert || !alertName.trim() || !alertPrice) return;
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
    } catch (err) {
      console.error("Edit alert failed:", err);
    }
  };

  const openDeleteAlert = (alert: Alert) => {
    setTargetAlert(alert);
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
    } catch (err) {
      console.error("Delete alert failed:", err);
    }
  };

  const resetAlertForm = () => {
    setAlertName("");
    setAlertPrice("");
    setAlertType("GTE");
    setAlertSymbol("BTCUSD");
  };

  /* ── Loading ── */
  if (!user)
    return (
      <div style={styles.loading}>
        <div style={styles.loadingDot} />
        <span>Connecting…</span>
      </div>
    );

  /* ─────────────────────────────────────────
     RENDER
  ───────────────────────────────────────── */

  return (
    <>
      {/* ── GLOBAL STYLES ── */}
      <style>{globalCSS}</style>

      <div style={styles.page}>
        {/* BG grid */}
        <div style={styles.bgGrid} />

        <div style={styles.app}>
          {/* ── HEADER ── */}
          <header style={styles.header}>
            <div style={styles.headerLeft}>
              <div style={styles.logoMark}>Δ</div>
              <div>
                <div style={styles.headerTitle}>WiseFox</div>
                <div style={styles.headerSub}>{user.email}</div>
              </div>
            </div>
            <button style={styles.logoutBtn} onClick={() => navigate("/")}>
              ↩ Logout
            </button>
          </header>

          {/* ── TICKER ── */}
          <div style={styles.tickerBar}>
            {[
              ["24H VOL", "$38.2B"],
              ["BTC DOM", "52.4%"],
              ["FEAR/GREED", "72 — Greed"],
              ["OPEN INT", "$12.8B"],
            ].map(([k, v]) => (
              <div key={k} style={styles.tickerItem}>
                {k} <span style={styles.tickerVal}>{v}</span>
              </div>
            ))}
          </div>

          {/* ── PRICE CARDS ── */}
          <div style={styles.priceGrid}>
            <PriceCard
              symbol="BTC / USD"
              price={Math.round(prices.BTCUSD)}
              change="+2.34%"
              color="btc"
            />
            <PriceCard
              symbol="XAU / USD"
              price={Math.round(prices.PAXGUSD)}
              change="+0.76%"
              color="xau"
            />
          </div>

          {/* ── MAIN GRID ── */}
          <div style={styles.mainGrid}>
            {/* ALERTS PANEL */}
            <div style={styles.panel}>
              <div style={styles.sectionHeader}>
                <span style={styles.sectionTitle}>Active Alerts</span>
                <button
                  style={{ ...styles.addBtn, ...styles.addBtnGreen }}
                  onClick={() => {
                    resetAlertForm();
                    setShowCreateAlert(true);
                  }}
                >
                  ＋ New Alert
                </button>
              </div>

              <div style={styles.listScroll}>
                {alerts.length === 0 ? (
                  <EmptyState icon="🔔" label="No active alerts" />
                ) : (
                  alerts.map((a) => (
                    <div
                      key={a.id}
                      style={styles.alertItem}
                      className="list-item"
                    >
                      <div style={styles.alertInfo}>
                        <div style={styles.alertName}>{a.name}</div>
                        <div style={styles.alertMeta}>
                          <Badge variant="blue">{a.symbol}</Badge>
                          <Badge variant={a.type === "GTE" ? "green" : "red"}>
                            {a.type === "GTE" ? "≥ Above" : "≤ Below"}
                          </Badge>
                          <Badge
                            variant={
                              a.status === "PENDING"
                                ? "blue"
                                : a.status === "TRIGGERED"
                                  ? "green"
                                  : "red"
                            }
                          >
                            {a.status}
                          </Badge>
                          <span style={{ color: "#8B9AB5", fontSize: 11 }}>
                            ${Number(a.price).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div style={styles.alertActions}>
                        <button
                          style={{ ...styles.iconBtn, ...styles.iconBtnBlue }}
                          onClick={() => openEditAlert(a)}
                          title="Edit"
                        >
                          ✎
                        </button>
                        <button
                          style={{ ...styles.iconBtn, ...styles.iconBtnRed }}
                          onClick={() => openDeleteAlert(a)}
                          title="Delete"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* ACCOUNTS PANEL */}
            <div style={styles.panel}>
              <div style={styles.sectionHeader}>
                <span style={styles.sectionTitle}>Accounts</span>
                <button
                  style={{ ...styles.addBtn, ...styles.addBtnBlue }}
                  onClick={() => setShowCreateAccount(true)}
                >
                  ＋ New Account
                </button>
              </div>

              <div style={styles.listScroll}>
                {accounts.length === 0 ? (
                  <EmptyState icon="💼" label="No accounts yet" />
                ) : (
                  accounts.map((acc) => (
                    <div
                      key={acc.id}
                      style={styles.accountItem}
                      className="list-item"
                    >
                      <div>
                        <div style={styles.accountName}>{acc.name}</div>
                        <div style={styles.accountBalance}>
                          $
                          {Number(acc.balance).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </div>
                      </div>
                      <div style={styles.accountActions}>
                        <button
                          style={{ ...styles.iconBtn, ...styles.iconBtnGreen }}
                          onClick={() => navigate(`/accounts/${acc.id}`)}
                        >
                          Trade
                        </button>
                        <button
                          style={{ ...styles.iconBtn, ...styles.iconBtnRed }}
                          onClick={() => handleDeleteAccount(acc.id)}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════
          MODAL — CREATE ACCOUNT
      ═══════════════════════════════════════ */}
      <Modal
        open={showCreateAccount}
        onClose={() => setShowCreateAccount(false)}
        title="New Account"
      >
        <FormGroup label="Account Name">
          <input
            style={styles.formInput}
            placeholder="e.g. Main Trading"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateAccount()}
          />
        </FormGroup>
        <FormGroup label="Starting Balance (USD)">
          <input
            style={styles.formInput}
            type="number"
            placeholder="e.g. 10000"
            value={accountBalance}
            onChange={(e) => setAccountBalance(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateAccount()}
          />
        </FormGroup>
        <button
          style={{ ...styles.submitBtn, ...styles.submitBtnBlue }}
          onClick={handleCreateAccount}
        >
          Create Account
        </button>
      </Modal>

      {/* ═══════════════════════════════════════
          MODAL — CREATE ALERT
      ═══════════════════════════════════════ */}
      <Modal
        open={showCreateAlert}
        onClose={() => setShowCreateAlert(false)}
        title="New Price Alert"
      >
        <FormGroup label="Alert Name">
          <input
            style={styles.formInput}
            placeholder="e.g. BTC Moon Watch"
            value={alertName}
            onChange={(e) => setAlertName(e.target.value)}
          />
        </FormGroup>
        <div style={styles.formRow}>
          <FormGroup label="Symbol">
            <select
              style={styles.formSelect}
              value={alertSymbol}
              onChange={(e) => setAlertSymbol(e.target.value)}
            >
              <option value="BTCUSD">BTCUSD</option>
              <option value="PAXGUSD">XAUUSD</option>
            </select>
          </FormGroup>
          <FormGroup label="Condition">
            <select
              style={styles.formSelect}
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
            style={styles.formInput}
            type="number"
            placeholder="e.g. 70000"
            value={alertPrice}
            onChange={(e) => setAlertPrice(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateAlert()}
          />
        </FormGroup>
        <button
          style={{ ...styles.submitBtn, ...styles.submitBtnGreen }}
          onClick={handleCreateAlert}
        >
          Create Alert
        </button>
      </Modal>

      {/* ═══════════════════════════════════════
          MODAL — EDIT ALERT
      ═══════════════════════════════════════ */}
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
            style={styles.formInput}
            placeholder="e.g. BTC Moon Watch"
            value={alertName}
            onChange={(e) => setAlertName(e.target.value)}
          />
        </FormGroup>
        <div style={styles.formRow}>
          <FormGroup label="Symbol">
            <select
              style={styles.formSelect}
              value={alertSymbol}
              onChange={(e) => setAlertSymbol(e.target.value)}
            >
              <option value="BTCUSD">BTCUSD</option>
              <option value="PAXGUSD">XAUUSD</option>
            </select>
          </FormGroup>
          <FormGroup label="Condition">
            <select
              style={styles.formSelect}
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
            style={styles.formInput}
            type="number"
            placeholder="e.g. 70000"
            value={alertPrice}
            onChange={(e) => setAlertPrice(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleEditAlert()}
          />
        </FormGroup>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            style={{ ...styles.submitBtn, ...styles.submitBtnBlue, flex: 1 }}
            onClick={handleEditAlert}
          >
            Save Changes
          </button>
          <button
            style={{
              ...styles.submitBtn,
              ...styles.submitBtnGhost,
              flex: "0 0 auto",
              padding: "13px 18px",
            }}
            onClick={() => {
              setShowEditAlert(false);
              setTargetAlert(null);
              resetAlertForm();
            }}
          >
            Cancel
          </button>
        </div>
      </Modal>

      {/* ═══════════════════════════════════════
          MODAL — DELETE ALERT CONFIRM
      ═══════════════════════════════════════ */}
      <Modal
        open={showDeleteAlert}
        onClose={() => {
          setShowDeleteAlert(false);
          setTargetAlert(null);
        }}
        title="Delete Alert"
      >
        <div style={styles.deleteBody}>
          <div style={styles.deleteIcon}>⚠</div>
          <p style={styles.deleteText}>
            Are you sure you want to delete{" "}
            <strong style={{ color: "#F0F4FF" }}>{targetAlert?.name}</strong>?
            <br />
            <span style={{ color: "#5A6580", fontSize: 12 }}>
              This action cannot be undone.
            </span>
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button
            style={{ ...styles.submitBtn, ...styles.submitBtnRed, flex: 1 }}
            onClick={handleDeleteAlert}
          >
            Yes, Delete
          </button>
          <button
            style={{ ...styles.submitBtn, ...styles.submitBtnGhost, flex: 1 }}
            onClick={() => {
              setShowDeleteAlert(false);
              setTargetAlert(null);
            }}
          >
            Cancel
          </button>
        </div>
      </Modal>
    </>
  );
}

export default Dashboard;

/* ─────────────────────────────────────────
   STYLES
───────────────────────────────────────── */

const C = {
  bg: "#080B12",
  surface: "#0D1117",
  surface2: "#111827",
  surface3: "#1a2234",
  border: "rgba(255,255,255,0.06)",
  borderGlow: "rgba(99,179,237,0.2)",
  text: "#F0F4FF",
  textMuted: "#5A6580",
  textDim: "#8B9AB5",
  accent: "#63B3ED",
  accent2: "#48BB78",
  danger: "#FC8181",
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: C.bg,
    color: C.text,
    fontFamily: "'Syne', sans-serif",
    position: "relative",
    overflowX: "hidden",
  },
  bgGrid: {
    position: "fixed",
    inset: 0,
    backgroundImage: `
      linear-gradient(rgba(99,179,237,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(99,179,237,0.03) 1px, transparent 1px)
    `,
    backgroundSize: "40px 40px",
    pointerEvents: "none",
    zIndex: 0,
  },
  app: {
    position: "relative",
    zIndex: 1,
    maxWidth: 1200,
    margin: "0 auto",
    padding: "24px 20px",
  },

  /* header */
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
    paddingBottom: 20,
    borderBottom: `1px solid ${C.border}`,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 14 },
  logoMark: {
    width: 38,
    height: 38,
    background: "linear-gradient(135deg, #63B3ED, #48BB78)",
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 16,
    fontWeight: 800,
    color: "#080B12",
  },
  headerTitle: { fontSize: 20, fontWeight: 700, letterSpacing: -0.5 },
  headerSub: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    color: C.textMuted,
    marginTop: 2,
  },
  logoutBtn: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 13,
    fontWeight: 600,
    padding: "8px 18px",
    background: "rgba(252,129,129,0.1)",
    border: "1px solid rgba(252,129,129,0.2)",
    color: C.danger,
    borderRadius: 8,
    cursor: "pointer",
    letterSpacing: 0.3,
    transition: "all 0.2s",
  },

  /* ticker */
  tickerBar: {
    display: "flex",
    gap: 20,
    overflowX: "auto",
    marginBottom: 28,
    padding: "10px 16px",
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    fontFamily: "'DM Mono', monospace",
    fontSize: 12,
    color: C.textMuted,
    scrollbarWidth: "none",
  },
  tickerItem: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    whiteSpace: "nowrap",
  },
  tickerVal: { color: C.accent2 },

  /* price cards */
  priceGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 16,
    marginBottom: 28,
  },
  priceCard: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    padding: "22px 24px",
    position: "relative",
    overflow: "hidden",
    transition: "transform 0.2s, border-color 0.2s",
    cursor: "default",
  },
  priceCardGlow: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: "50%",
    opacity: 0.07,
    pointerEvents: "none",
  },
  priceLabel: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    fontWeight: 500,
    color: C.textMuted,
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    display: "flex",
    alignItems: "center",
    gap: 7,
  },
  priceDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    display: "inline-block",
  },
  priceValue: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 28,
    fontWeight: 500,
    color: C.text,
    marginTop: 10,
    letterSpacing: -1,
  },
  priceChange: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    color: C.accent2,
    marginTop: 4,
  },

  /* main grid */
  mainGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 20,
  },
  panel: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    padding: 22,
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    color: C.textDim,
  },
  addBtn: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 12,
    fontWeight: 700,
    padding: "7px 14px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    letterSpacing: 0.3,
    transition: "all 0.2s",
  },
  addBtnBlue: {
    background: "rgba(99,179,237,0.1)",
    color: C.accent,
    border: "1px solid rgba(99,179,237,0.2)",
  },
  addBtnGreen: {
    background: "rgba(72,187,120,0.1)",
    color: C.accent2,
    border: "1px solid rgba(72,187,120,0.2)",
  },
  listScroll: {
    maxHeight: 300,
    overflowY: "auto",
    paddingRight: 2,
  },

  /* alert item */
  alertItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 14px",
    background: C.surface2,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    marginBottom: 8,
    transition: "border-color 0.2s",
  },
  alertInfo: { display: "flex", flexDirection: "column", gap: 5 },
  alertName: { fontSize: 13, fontWeight: 600 },
  alertMeta: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontFamily: "'DM Mono', monospace",
  },
  alertActions: { display: "flex", gap: 6 },

  /* account item */
  accountItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 16px",
    background: C.surface2,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    marginBottom: 8,
    transition: "border-color 0.2s",
  },
  accountName: { fontSize: 14, fontWeight: 600 },
  accountBalance: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 13,
    color: C.accent2,
    marginTop: 3,
  },
  accountActions: { display: "flex", gap: 8 },

  /* icon buttons */
  iconBtn: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 11,
    fontWeight: 700,
    padding: "6px 11px",
    borderRadius: 7,
    border: "none",
    cursor: "pointer",
    transition: "all 0.2s",
    letterSpacing: 0.3,
  },
  iconBtnBlue: {
    background: "rgba(99,179,237,0.1)",
    color: C.accent,
    border: "1px solid rgba(99,179,237,0.18)",
  },
  iconBtnGreen: {
    background: "rgba(72,187,120,0.1)",
    color: C.accent2,
    border: "1px solid rgba(72,187,120,0.2)",
  },
  iconBtnRed: {
    background: "rgba(252,129,129,0.1)",
    color: C.danger,
    border: "1px solid rgba(252,129,129,0.15)",
  },

  /* badge */
  badge: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 10,
    fontWeight: 500,
    padding: "2px 7px",
    borderRadius: 4,
    letterSpacing: 0.5,
  },

  /* empty state */
  emptyState: {
    textAlign: "center",
    padding: "32px 16px",
    color: C.textMuted,
    fontSize: 13,
    fontFamily: "'DM Mono', monospace",
    border: "1px dashed rgba(255,255,255,0.07)",
    borderRadius: 12,
  },
  emptyIcon: { fontSize: 28, marginBottom: 8, opacity: 0.35 },

  /* modal overlay */
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.78)",
    backdropFilter: "blur(10px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 200,
    padding: 20,
    transition: "opacity 0.25s",
  },
  modal: {
    background: C.surface,
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 20,
    padding: 28,
    width: "100%",
    maxWidth: 420,
    boxShadow: "0 40px 80px rgba(0,0,0,0.6)",
  },
  modalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  modalTitle: { fontSize: 17, fontWeight: 700, letterSpacing: -0.3 },
  modalClose: {
    width: 30,
    height: 30,
    background: C.surface2,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    color: C.textMuted,
    fontSize: 14,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
    transition: "all 0.2s",
    fontFamily: "inherit",
  },

  /* form */
  formLabel: {
    display: "block",
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    fontWeight: 500,
    color: C.textMuted,
    letterSpacing: "1px",
    textTransform: "uppercase" as const,
    marginBottom: 7,
  },
  formInput: {
    width: "100%",
    fontFamily: "'DM Mono', monospace",
    fontSize: 14,
    padding: "11px 14px",
    background: C.surface2,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    color: C.text,
    outline: "none",
    boxSizing: "border-box" as const,
    transition: "border-color 0.2s",
  },
  formSelect: {
    width: "100%",
    fontFamily: "'DM Mono', monospace",
    fontSize: 14,
    padding: "11px 14px",
    background: C.surface2,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    color: C.text,
    outline: "none",
    appearance: "none" as const,
    boxSizing: "border-box" as const,
    cursor: "pointer",
  },
  formRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  submitBtn: {
    fontFamily: "'Syne', sans-serif",
    width: "100%",
    padding: 13,
    border: "none",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: 0.5,
    marginTop: 8,
    transition: "all 0.2s",
    boxSizing: "border-box" as const,
  },
  submitBtnBlue: {
    background: "linear-gradient(135deg, #63B3ED, #4299E1)",
    color: "#080B12",
  },
  submitBtnGreen: {
    background: "linear-gradient(135deg, #48BB78, #38A169)",
    color: "#080B12",
  },
  submitBtnRed: {
    background: "linear-gradient(135deg, #FC8181, #E53E3E)",
    color: "#fff",
  },
  submitBtnGhost: {
    background: C.surface2,
    border: `1px solid ${C.border}`,
    color: C.textDim,
  },

  /* delete confirm */
  deleteBody: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    textAlign: "center" as const,
    gap: 14,
    padding: "8px 0 16px",
  },
  deleteIcon: {
    fontSize: 32,
    background: "rgba(252,129,129,0.1)",
    border: "1px solid rgba(252,129,129,0.2)",
    borderRadius: "50%",
    width: 60,
    height: 60,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: C.danger,
  },
  deleteText: {
    fontSize: 14,
    lineHeight: 1.7,
    color: C.textDim,
  },

  /* loading */
  loading: {
    minHeight: "100vh",
    background: C.bg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    color: C.textMuted,
    fontFamily: "'DM Mono', monospace",
    fontSize: 14,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: C.accent,
    animation: "pulse 1.5s infinite",
  },
};

/* ─────────────────────────────────────────
   GLOBAL CSS (injected via <style>)
───────────────────────────────────────── */

const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');

  * { box-sizing: border-box; }

  body {
    margin: 0;
    -webkit-font-smoothing: antialiased;
  }

  ::-webkit-scrollbar { width: 3px; height: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #1a2234; border-radius: 4px; }

  .list-item:hover {
    border-color: rgba(255,255,255,0.11) !important;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  @keyframes fadeSlideIn {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* responsive */
  @media (max-width: 640px) {
    .price-grid-responsive {
      grid-template-columns: 1fr !important;
    }
    .main-grid-responsive {
      grid-template-columns: 1fr !important;
    }
  }
`;
