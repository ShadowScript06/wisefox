import { useEffect, useState } from "react";
import { Heatmap } from "../components/HeatMap";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import AccountActivity from "../components/AccountActivity";

/* ─────────────────────────────────────────
   TYPES
───────────────────────────────────────── */
type HeatmapRow = { date: string; trades: number; pnl: number };
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
    heatmap: { startDate: string; endDate: string; data: HeatmapRow[] };
  };
};

/* ─────────────────────────────────────────
   GLOBAL CSS
───────────────────────────────────────── */
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
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes shimmer {
    0%   { background-position: -200% 0; }
    100% { background-position:  200% 0; }
  }
  @keyframes glow-pulse {
    0%, 100% { opacity: 0.35; }
    50%       { opacity: 0.65; }
  }
  @keyframes dot-pulse {
    0%, 100% { opacity: 1;   transform: scale(1); }
    50%       { opacity: 0.3; transform: scale(0.75); }
  }

  .anim-fade-up  { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both; }
  .anim-fade-in  { animation: fadeIn 0.35s ease both; }

  .skeleton {
    background: linear-gradient(90deg, #1c1b1b 25%, #2a2a2a 50%, #1c1b1b 75%);
    background-size: 200% 100%;
    animation: shimmer 1.6s infinite;
    border-radius: 6px;
  }

  .stat-card-ee {
    transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
  }
  .stat-card-ee:hover {
    border-color: rgba(37,179,23,0.25) !important;
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(37,179,23,0.05);
  }

  .panel-ee {
    background: linear-gradient(180deg, #121212 0%, #0e0e0e 100%);
    border: 1px solid rgba(37,179,23,0.08);
    border-radius: 12px;
    overflow: hidden;
    transition: border-color 0.2s;
  }

  .btn-back-ee {
    display: flex; align-items: center; gap: 6px;
    font-family: 'Manrope', sans-serif;
    font-size: 11px; font-weight: 700; letter-spacing: 0.5px;
    padding: 8px 16px;
    background: rgba(179,37,23,0.08);
    border: 1px solid rgba(252,129,129,0.2);
    border-radius: 8px; color: #fc8181; cursor: pointer;
    transition: background 0.2s, border-color 0.2s;
  }
  .btn-back-ee:hover { background: rgba(252,129,129,0.12); border-color: rgba(252,129,129,0.35); }

  ::-webkit-scrollbar { width: 3px; height: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #1c1b1b; border-radius: 4px; }

  @media (max-width: 900px) {
    .stat-grid-ee { grid-template-columns: repeat(2, 1fr) !important; }
  }
  @media (max-width: 480px) {
    .stat-grid-ee { grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
  }
`;

/* ─────────────────────────────────────────
   HOOK
───────────────────────────────────────── */
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
        if (!payload?.heatmap || !Array.isArray(payload.heatmap.data))
          throw new Error("Invalid heatmap response");
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

/* ─────────────────────────────────────────
   STAT CARD
───────────────────────────────────────── */
function StatCard({
  label,
  value,
  sub,
  accent = "default",
  icon,
  delay,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent?: "blue" | "green" | "red" | "yellow" | "default";
  icon: string;
  delay?: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "#5be146",
    green: "#25b317",
    red: "#fc8181",
    yellow: "#fbbf24",
    default: "#e5e2e1",
  };
  const c = colorMap[accent];

  return (
    <div
      className="stat-card-ee anim-fade-up"
      style={{
        animationDelay: delay || "0s",
        background: "linear-gradient(180deg,#121212 0%,#0e0e0e 100%)",
        border: "1px solid rgba(37,179,23,0.08)",
        borderRadius: "12px",
        padding: "18px 20px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* glow blob */}
      <div
        style={{
          position: "absolute",
          top: -20,
          right: -20,
          width: 70,
          height: 70,
          borderRadius: "50%",
          background: c,
          opacity: 0.05,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginBottom: "10px",
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontSize: "14px", color: c }}
        >
          {icon}
        </span>
        <span
          style={{
            fontFamily: "'JetBrains Mono',monospace",
            fontSize: "10px",
            color: "#879580",
            letterSpacing: "1px",
            textTransform: "uppercase" as const,
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          fontFamily: "'JetBrains Mono',monospace",
          fontSize: "22px",
          fontWeight: 600,
          color: c,
          letterSpacing: "-0.5px",
          lineHeight: 1.15,
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontFamily: "'JetBrains Mono',monospace",
            fontSize: "10px",
            color: "#3e4a39",
            marginTop: "4px",
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   SKELETON STAT CARD
───────────────────────────────────────── */
function StatSkeleton() {
  return (
    <div
      style={{
        background: "linear-gradient(180deg,#121212 0%,#0e0e0e 100%)",
        border: "1px solid rgba(37,179,23,0.06)",
        borderRadius: "12px",
        padding: "18px 20px",
      }}
    >
      <div
        className="skeleton"
        style={{ width: "80px", height: "11px", marginBottom: "12px" }}
      />
      <div
        className="skeleton"
        style={{ width: "110px", height: "22px", marginBottom: "6px" }}
      />
      <div className="skeleton" style={{ width: "60px", height: "10px" }} />
    </div>
  );
}

/* ─────────────────────────────────────────
   PANEL HEADER
───────────────────────────────────────── */
function PanelHeader({
  icon,
  title,
  meta,
}: {
  icon: string;
  title: string;
  meta?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 20px",
        borderBottom: "1px solid #1c1b1b",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span
          className="material-symbols-outlined"
          style={{ fontSize: "15px", color: "#25b317" }}
        >
          {icon}
        </span>
        <span
          style={{
            fontFamily: "'Manrope',sans-serif",
            fontSize: "11px",
            fontWeight: 700,
            color: "#879580",
            letterSpacing: "1.2px",
            textTransform: "uppercase" as const,
          }}
        >
          {title}
        </span>
      </div>
      {meta && (
        <span
          style={{
            fontFamily: "'JetBrains Mono',monospace",
            fontSize: "10px",
            color: "#3e4a39",
          }}
        >
          {meta}
        </span>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   STATE ROWS
───────────────────────────────────────── */
function LoadingRow() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "28px 20px",
      }}
    >
      <div
        style={{
          width: 16,
          height: 16,
          border: "2px solid rgba(37,179,23,0.2)",
          borderTop: "2px solid #25b317",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontFamily: "'JetBrains Mono',monospace",
          fontSize: "12px",
          color: "#879580",
          letterSpacing: "1px",
        }}
      >
        Loading…
      </span>
    </div>
  );
}

function ErrorRow({ message }: { message: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "24px 20px",
        background: "rgba(179,37,23,0.04)",
      }}
    >
      <span
        className="material-symbols-outlined"
        style={{ fontSize: "16px", color: "#fc8181", flexShrink: 0 }}
      >
        error
      </span>
      <span
        style={{
          fontFamily: "'JetBrains Mono',monospace",
          fontSize: "12px",
          color: "#fc8181",
        }}
      >
        {message}
      </span>
    </div>
  );
}

function EmptyRow({ message }: { message: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        padding: "36px 20px",
        gap: "10px",
        border: "1px dashed rgba(37,179,23,0.12)",
        borderRadius: "10px",
        margin: "16px 20px",
        background: "rgba(37,179,23,0.02)",
      }}
    >
      <span
        className="material-symbols-outlined"
        style={{ fontSize: "28px", color: "rgba(37,179,23,0.25)" }}
      >
        calendar_today
      </span>
      <span
        style={{
          fontFamily: "'JetBrains Mono',monospace",
          fontSize: "12px",
          color: "#879580",
          textAlign: "center" as const,
        }}
      >
        {message}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────
   WIN RATE BAR
───────────────────────────────────────── */
function WinRateBar({
  winRate,
  wins,
  losses,
}: {
  winRate: number;
  wins: number;
  losses: number;
}) {
  const total = wins + losses;
  const winPct = total > 0 ? (wins / total) * 100 : 0;
  const losePct = 100 - winPct;
  return (
    <div style={{ padding: "16px 20px", borderTop: "1px solid #1c1b1b" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "8px",
        }}
      >
        <span
          style={{
            fontFamily: "'JetBrains Mono',monospace",
            fontSize: "10px",
            color: "#25b317",
            letterSpacing: "0.5px",
          }}
        >
          WIN {winPct.toFixed(1)}%
        </span>
        <span
          style={{
            fontFamily: "'JetBrains Mono',monospace",
            fontSize: "10px",
            color: "#fc8181",
            letterSpacing: "0.5px",
          }}
        >
          LOSS {losePct.toFixed(1)}%
        </span>
      </div>
      <div
        style={{
          height: "4px",
          borderRadius: "4px",
          background: "#1c1b1b",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            borderRadius: "4px",
            background: "linear-gradient(90deg,#25b317,#5be146)",
            width: `${winPct}%`,
            transition: "width 0.8s cubic-bezier(0.22,1,0.36,1)",
          }}
        />
      </div>
      <div style={{ display: "flex", gap: "16px", marginTop: "8px" }}>
        <span
          style={{
            fontFamily: "'JetBrains Mono',monospace",
            fontSize: "10px",
            color: "#3e4a39",
          }}
        >
          <span style={{ color: "#25b317", fontWeight: 600 }}>{wins}W</span>{" "}
          profitable
        </span>
        <span
          style={{
            fontFamily: "'JetBrains Mono',monospace",
            fontSize: "10px",
            color: "#3e4a39",
          }}
        >
          <span style={{ color: "#fc8181", fontWeight: 600 }}>{losses}L</span>{" "}
          losing
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   PAGE
───────────────────────────────────────── */
export default function AccountOverview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { heatmap, summary, loading, error } = useHeatmap(id);

  // Invalid ID guard
  if (!id) {
    return (
      <>
        <style>{GLOBAL_CSS}</style>
        <div
          style={{
            minHeight: "100vh",
            background: "#050505",
            display: "flex",
            flexDirection: "column" as const,
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "rgba(179,37,23,0.1)",
              border: "1px solid rgba(252,129,129,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "24px", color: "#fc8181" }}
            >
              error
            </span>
          </div>
          <span
            style={{
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: "13px",
              color: "#879580",
            }}
          >
            Invalid account ID
          </span>
        </div>
      </>
    );
  }

  const pnlAccent =
    summary == null
      ? "default"
      : summary.totalPnl > 0
        ? "green"
        : summary.totalPnl < 0
          ? "red"
          : "default";

  const winAccent =
    summary == null
      ? "default"
      : summary.winRate >= 60
        ? "green"
        : summary.winRate >= 40
          ? "yellow"
          : "red";

  return (
    <>
      <style>{GLOBAL_CSS}</style>

      <div
        style={{
          minHeight: "100vh",
          background: "#050505",
          fontFamily: "'Manrope',sans-serif",
          color: "#e5e2e1",
          position: "relative",
        }}
      >
        {/* Background grid */}
        <div
          style={{
            position: "fixed",
            inset: 0,
            pointerEvents: "none",
            zIndex: 0,
            backgroundImage: `
            linear-gradient(rgba(37,179,23,0.025) 1px,transparent 1px),
            linear-gradient(90deg,rgba(37,179,23,0.025) 1px,transparent 1px)
          `,
            backgroundSize: "40px 40px",
          }}
        />

        {/* Ambient glow */}
        <div
          style={{
            position: "fixed",
            top: "10%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "600px",
            height: "200px",
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse,rgba(37,179,23,0.04) 0%,transparent 70%)",
            pointerEvents: "none",
            zIndex: 0,
            animation: "glow-pulse 5s ease infinite",
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 1,
            maxWidth: "1280px",
            margin: "0 auto",
            padding: "24px 20px",
            display: "flex",
            flexDirection: "column" as const,
            gap: "24px",
          }}
        >
          {/* ── HEADER ── */}
          <header
            className="anim-fade-up"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingBottom: "20px",
              borderBottom: "1px solid #1c1b1b",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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
                    fontSize: "16px",
                    fontWeight: 800,
                    color: "#e5e2e1",
                    letterSpacing: "-0.3px",
                  }}
                >
                  Account Overview
                </div>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: "10px",
                    color: "#879580",
                    letterSpacing: "0.5px",
                  }}
                >
                  Trades · PnL performance · Activity heatmap
                </div>
              </div>
            </div>
            <button className="btn-back-ee" onClick={() => navigate(-1)}>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "14px" }}
              >
                arrow_back
              </span>
              Back
            </button>
          </header>

          {/* ── STAT CARDS ── */}
          <div
            className="stat-grid-ee"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: "14px",
            }}
          >
            {loading ? (
              <>
                {[0, 1, 2, 3].map((i) => (
                  <StatSkeleton key={i} />
                ))}
              </>
            ) : summary ? (
              <>
                <StatCard
                  label="Total Trades"
                  value={summary.totalTrades}
                  sub="all time"
                  accent="blue"
                  icon="receipt_long"
                  delay="0s"
                />
                <StatCard
                  label="Win Rate"
                  value={`${summary.winRate}%`}
                  sub={`${summary.profitableTrades}W / ${summary.losingTrades}L`}
                  accent={winAccent}
                  icon="emoji_events"
                  delay="0.06s"
                />
                <StatCard
                  label="Total PnL"
                  value={
                    (summary.totalPnl >= 0 ? "+" : "") +
                    summary.totalPnl.toFixed(2)
                  }
                  sub="net profit / loss"
                  accent={pnlAccent}
                  icon="trending_up"
                  delay="0.12s"
                />
                <StatCard
                  label="Charges"
                  value={summary.totalCharges.toFixed(2)}
                  sub="fees & commissions"
                  accent="yellow"
                  icon="toll"
                  delay="0.18s"
                />
              </>
            ) : null}
          </div>

          {/* ── WIN RATE VISUAL (only when data loaded) ── */}
          {summary && !loading && (
            <div
              className="panel-ee anim-fade-up"
              style={{ animationDelay: "0.22s" }}
            >
              <PanelHeader icon="bar_chart" title="Performance Breakdown" />
              <WinRateBar
                winRate={summary.winRate}
                wins={summary.profitableTrades}
                losses={summary.losingTrades}
              />
              {/* PnL vs Charges row */}
              <div
                style={{
                  padding: "14px 20px 16px",
                  display: "flex",
                  gap: "20px",
                  flexWrap: "wrap" as const,
                }}
              >
                {[
                  {
  label: "Gross PNL",
  value: `${
    summary.totalPnl + summary.totalCharges >= 0 ? "+" : ""
  }$${(summary.totalPnl + summary.totalCharges).toFixed(2)}`,
  color:
    summary.totalPnl + summary.totalCharges >= 0
      ? "#5be146"
      : "#fc8181",
},
                  {
                    label: "NET PnL",
                    value: `${summary.totalPnl >= 0 ? "+" : ""}$${summary.totalPnl.toFixed(2)}`,
                    color: summary.totalPnl >= 0 ? "#25b317" : "#fc8181",
                  },
                  {
                    label: "Total Charges",
                    value: `-$${summary.totalCharges.toFixed(2)}`,
                    color: "#fbbf24",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      flexDirection: "column" as const,
                      gap: "3px",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono',monospace",
                        fontSize: "10px",
                        color: "#879580",
                        letterSpacing: "0.8px",
                        textTransform: "uppercase" as const,
                      }}
                    >
                      {item.label}
                    </span>
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono',monospace",
                        fontSize: "16px",
                        fontWeight: 600,
                        color: item.color,
                        letterSpacing: "-0.3px",
                      }}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── HEATMAP ── */}
          <div
            className="panel-ee anim-fade-up"
            style={{ animationDelay: "0.28s" }}
          >
            <PanelHeader
              icon="calendar_month"
              title="Activity Heatmap"
              meta={
                heatmap
                  ? `${heatmap.startDate} → ${heatmap.endDate}`
                  : undefined
              }
            />

            {loading && <LoadingRow />}
            {error && <ErrorRow message={error} />}
            {!loading && !error && heatmap?.data.length === 0 && (
              <EmptyRow message="No trading activity found for this account." />
            )}
            {!loading && !error && heatmap && heatmap.data.length > 0 && (
              <div style={{ padding: "18px 20px", overflowX: "auto" }}>
                <Heatmap data={heatmap.data} />
              </div>
            )}
          </div>

          {/* ── ACCOUNT ACTIVITY ── */}
          <div
            className="panel-ee anim-fade-up"
            style={{ animationDelay: "0.34s" }}
          >
            <PanelHeader icon="receipt_long" title="Orders & Trades" />
            <div style={{ padding: "12px 20px 20px" }}>
              <AccountActivity accountId={id} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
