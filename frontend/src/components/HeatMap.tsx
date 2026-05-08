import { useMemo, useState, useRef, useCallback } from "react";

/* ─────────────────────────────────────────
   TYPES
───────────────────────────────────────── */
type HeatmapRow = { date: string; trades: number; pnl: number; };
type Props = { data: HeatmapRow[]; };

/* ─────────────────────────────────────────
   CONFIG
───────────────────────────────────────── */
const CELL = 12;
const GAP  = 3;

const DAYS = [
  { label: "Mon", show: true  },
  { label: "",    show: false },
  { label: "Wed", show: true  },
  { label: "",    show: false },
  { label: "Fri", show: true  },
  { label: "",    show: false },
  { label: "",    show: false },
];

const CSS = `
  .hm-cell {
    border-radius: 3px;
    cursor: default;
    transition: transform 0.12s ease, filter 0.12s ease, box-shadow 0.12s ease;
    flex-shrink: 0;
  }
  .hm-cell:hover {
    transform: scale(1.5) !important;
    z-index: 2;
    filter: brightness(1.35);
  }
  .hm-toggle {
    font-family: 'Manrope', sans-serif;
    font-size: 10px; font-weight: 700;
    letter-spacing: 0.8px; text-transform: uppercase;
    padding: 6px 14px; border-radius: 6px;
    cursor: pointer; transition: all 0.2s; border: 1px solid transparent;
  }
  .hm-toggle.active-trades { background: rgba(37,179,23,0.12); color: #25b317; border-color: rgba(37,179,23,0.25); }
  .hm-toggle.active-pnl    { background: rgba(91,225,70,0.1);  color: #5be146; border-color: rgba(91,225,70,0.2); }
  .hm-toggle.inactive       { background: #1c1b1b; color: #879580; border-color: rgba(255,255,255,0.04); }
  .hm-toggle:hover          { opacity: 0.85; }

  @keyframes hmTipIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  .hm-tip { animation: hmTipIn 0.12s ease both; pointer-events: none; }
`;

/* ─────────────────────────────────────────
   COLORS
───────────────────────────────────────── */
function getColor(v: HeatmapRow | undefined, mode: "trades" | "pnl"): string {
  if (!v) return "#1c1b1b";
  if (mode === "trades") {
    const t = v.trades || 0;
    if (t === 0) return "#1c1b1b";
    if (t < 2)   return "rgba(37,179,23,0.14)";
    if (t < 5)   return "rgba(37,179,23,0.30)";
    if (t < 10)  return "rgba(37,179,23,0.55)";
    return "#25b317";
  }
  const p = v.pnl || 0;
  if (p === 0) return "#1c1b1b";
  if (p > 0) {
    if (p < 100)  return "rgba(91,225,70,0.15)";
    if (p < 500)  return "rgba(91,225,70,0.35)";
    return "#5be146";
  }
  if (p > -100)  return "rgba(252,129,129,0.15)";
  if (p > -500)  return "rgba(252,129,129,0.35)";
  return "#fc8181";
}

function getBorder(v: HeatmapRow | undefined, mode: "trades" | "pnl"): string {
  if (!v || (mode === "trades" ? v.trades === 0 : v.pnl === 0)) return "transparent";
  if (mode === "trades") return "rgba(37,179,23,0.3)";
  return v.pnl > 0 ? "rgba(91,225,70,0.3)" : "rgba(252,129,129,0.3)";
}

/* ─────────────────────────────────────────
   MONTH LABELS
───────────────────────────────────────── */
function getMonthLabels(weeks: { date: string | null }[][]): { label: string; weekIdx: number }[] {
  const seen = new Set<string>();
  const labels: { label: string; weekIdx: number }[] = [];
  weeks.forEach((week, wi) => {
    const firstDay = week.find(d => d.date);
    if (!firstDay?.date) return;
    const month = new Date(firstDay.date).toLocaleDateString("en-US", { month: "short" });
    if (!seen.has(month)) { seen.add(month); labels.push({ label: month, weekIdx: wi }); }
  });
  return labels;
}

/* ─────────────────────────────────────────
   TOOLTIP STATE
   x, y are relative to gridRef (position:relative)
───────────────────────────────────────── */
type TipState = { text: string; x: number; y: number; below: boolean; } | null;

/* ─────────────────────────────────────────
   COMPONENT
───────────────────────────────────────── */
export function Heatmap({ data }: Props) {
  const [mode, setMode]           = useState<"trades" | "pnl">("trades");
  const [hoveredCell, setHovered] = useState<HeatmapRow | null>(null);
  const [tip, setTip]             = useState<TipState>(null);
  const gridRef                   = useRef<HTMLDivElement>(null);

  const handleMouseEnter = useCallback((
    e: React.MouseEvent,
    d: { date: string | null; value?: HeatmapRow },
  ) => {
    if (!d.date || !gridRef.current) return;

    const cellRect    = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const wrapperRect = gridRef.current.getBoundingClientRect();

    // positions relative to the wrapper
    const relX      = cellRect.left + cellRect.width / 2 - wrapperRect.left;
    const relTop    = cellRect.top    - wrapperRect.top;
    const relBottom = cellRect.bottom - wrapperRect.top;
    const wrapperH  = wrapperRect.height;

    // if cell is in top 45% of wrapper → show below, else above
    const below = relTop < wrapperH * 0.45;

    const text = d.value
      ? `${d.date} · ${d.value.trades} trade${d.value.trades !== 1 ? "s" : ""} · PnL: ${d.value.pnl >= 0 ? "+" : ""}$${d.value.pnl.toFixed(0)}`
      : d.date;

    setTip({ text, x: relX, y: below ? relBottom : relTop, below });
    setHovered(d.value || null);
  }, []);

  const handleMouseLeave = useCallback(() => { setTip(null); setHovered(null); }, []);

  /* ── data ── */
  const map = useMemo(() => {
    const m = new Map<string, HeatmapRow>();
    data.forEach(d => m.set(d.date, d));
    return m;
  }, [data]);

  const days = useMemo(() => {
    const res: { date: string | null; value?: HeatmapRow }[] = [];
    const today    = new Date();
    const rawStart = new Date(today);
    rawStart.setDate(today.getDate() - 364);
    const dow    = rawStart.getDay();
    const rewind = dow === 0 ? 6 : dow - 1;
    const start  = new Date(rawStart);
    start.setDate(rawStart.getDate() - rewind);
    for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
      const iso = new Date(d).toISOString().split("T")[0];
      res.push({ date: iso, value: map.get(iso) });
    }
    return res;
  }, [map]);

  const weeks = useMemo(() => {
    const w: typeof days[] = [];
    let cur: typeof days = [];
    days.forEach(d => {
      cur.push(d);
      if (cur.length === 7) { w.push(cur); cur = []; }
    });
    if (cur.length) w.push(cur);
    return w;
  }, [days]);

  const monthLabels = useMemo(() => getMonthLabels(weeks), [weeks]);

  const stats = useMemo(() => ({
    activeDays:  data.filter(d => d.trades > 0).length,
    totalTrades: data.reduce((s, d) => s + d.trades, 0),
    totalPnl:    data.reduce((s, d) => s + d.pnl,    0),
  }), [data]);

  const cellSize = CELL + GAP;

  return (
    <>
      <style>{CSS}</style>

      <div style={{ fontFamily: "'Manrope',sans-serif", color: "#e5e2e1" }}>

        {/* ── TOOLBAR ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" as const, gap: "10px", marginBottom: "16px" }}>
          <div style={{ display: "flex", gap: "6px" }}>
            <button className={`hm-toggle${mode === "trades" ? " active-trades" : " inactive"}`} onClick={() => setMode("trades")}>Trades</button>
            <button className={`hm-toggle${mode === "pnl"    ? " active-pnl"    : " inactive"}`} onClick={() => setMode("pnl")}>PnL</button>
          </div>
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" as const }}>
            {[
              { label: "Active Days",  value: String(stats.activeDays) },
              { label: "Total Trades", value: String(stats.totalTrades) },
              { label: "Total PnL",    value: `${stats.totalPnl >= 0 ? "+" : ""}$${stats.totalPnl.toFixed(0)}`, color: stats.totalPnl >= 0 ? "#25b317" : "#fc8181" },
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column" as const, gap: "2px" }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "9px", color: "#879580", letterSpacing: "0.8px", textTransform: "uppercase" as const }}>{s.label}</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "13px", fontWeight: 600, color: s.color || "#e5e2e1" }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── GRID WRAPPER (position:relative — tooltip anchors here) ── */}
        <div style={{ overflowX: "auto", paddingBottom: "8px" }}>
          <div
            ref={gridRef}
            style={{ display: "inline-flex", gap: "8px", minWidth: "max-content", position: "relative" }}
          >
            {/* Day labels */}
            <div style={{ display: "flex", flexDirection: "column" as const, paddingTop: "20px", flexShrink: 0 }}>
              {DAYS.map((d, i) => (
                <div key={i} style={{
                  height: cellSize, display: "flex", alignItems: "center",
                  fontFamily: "'JetBrains Mono',monospace",
                  fontSize: "9px", color: "#3e4a39",
                  width: "24px", justifyContent: "flex-end", paddingRight: "4px",
                }}>
                  {d.show ? d.label : ""}
                </div>
              ))}
            </div>

            {/* Weeks */}
            <div style={{ flexShrink: 0 }}>
              {/* Month labels */}
              <div style={{ position: "relative", height: "18px", marginBottom: "2px" }}>
                {monthLabels.map((m, i) => (
                  <span key={i} style={{
                    position: "absolute", left: m.weekIdx * cellSize,
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: "9px", color: "#879580", letterSpacing: "0.5px",
                    textTransform: "uppercase" as const, whiteSpace: "nowrap",
                  }}>{m.label}</span>
                ))}
              </div>

              {/* Cells */}
              <div style={{ display: "flex", gap: `${GAP}px` }}>
                {weeks.map((week, wi) => (
                  <div key={wi} style={{ display: "flex", flexDirection: "column" as const, gap: `${GAP}px` }}>
                    {week.map((d, di) => {
                      if (!d.date) return <div key={di} style={{ width: CELL, height: CELL, flexShrink: 0 }} />;
                      const c    = getColor(d.value, mode);
                      const bord = getBorder(d.value, mode);
                      return (
                        <div
                          key={di}
                          className="hm-cell"
                          onMouseEnter={(e) => handleMouseEnter(e, d)}
                          onMouseLeave={handleMouseLeave}
                          style={{
                            width: CELL, height: CELL,
                            background: c, border: `1px solid ${bord}`,
                            boxShadow: d.value && (d.value.trades > 0 || d.value.pnl !== 0) ? `0 0 5px ${c}66` : "none",
                          }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* ── TOOLTIP — absolute inside grid wrapper, never leaves heatmap ── */}
            {tip && (
              <div
                className="hm-tip"
                style={{
                  position: "absolute",
                  left: tip.x,
                  top: tip.below ? tip.y + 6 : tip.y - 6,
                  transform: tip.below ? "translateX(-50%)" : "translateX(-50%) translateY(-100%)",
                  background: "#141414",
                  border: "1px solid rgba(37,179,23,0.3)",
                  borderRadius: "7px",
                  padding: "5px 11px",
                  fontFamily: "'JetBrains Mono',monospace",
                  fontSize: "10px",
                  color: "#e5e2e1",
                  whiteSpace: "nowrap" as const,
                  zIndex: 50,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.85), 0 0 12px rgba(37,179,23,0.1)",
                  letterSpacing: "0.3px",
                }}
              >
                {tip.text}
                {/* arrow */}
                <div style={{
                  position: "absolute", left: "50%",
                  transform: "translateX(-50%)",
                  width: 0, height: 0,
                  ...(tip.below
                    ? { top: -5, borderBottom: "5px solid rgba(37,179,23,0.35)", borderLeft: "5px solid transparent", borderRight: "5px solid transparent" }
                    : { bottom: -5, borderTop: "5px solid rgba(37,179,23,0.35)", borderLeft: "5px solid transparent", borderRight: "5px solid transparent" }
                  ),
                }} />
              </div>
            )}
          </div>
        </div>

        {/* ── LEGEND ── */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "12px" }}>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "9px", color: "#3e4a39" }}>Less</span>
          {(mode === "trades"
            ? ["#1c1b1b", "rgba(37,179,23,0.15)", "rgba(37,179,23,0.35)", "rgba(37,179,23,0.6)", "#25b317"]
            : ["#1c1b1b", "rgba(252,129,129,0.2)", "rgba(252,129,129,0.5)", "rgba(91,225,70,0.3)", "#5be146"]
          ).map((c, i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: "2px", background: c, border: "1px solid rgba(37,179,23,0.1)" }} />
          ))}
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "9px", color: "#3e4a39" }}>More</span>

          {hoveredCell && (
            <div style={{ marginLeft: "auto", display: "flex", gap: "14px" }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: "#879580" }}>
                {hoveredCell.trades} trade{hoveredCell.trades !== 1 ? "s" : ""}
              </span>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", fontWeight: 600, color: hoveredCell.pnl >= 0 ? "#25b317" : "#fc8181" }}>
                {hoveredCell.pnl >= 0 ? "+" : ""}${hoveredCell.pnl.toFixed(2)}
              </span>
            </div>
          )}
        </div>

      </div>
    </>
  );
}