import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";

/* ─────────────────────────────────────────
   TYPES
───────────────────────────────────────── */
type Journal = {
  id: string; script: string; date: string;
  entryTime: string; exitTime?: string;
  pnl?: number; entryReason: string;
  exitReason?: string; quantity: number;
};

/* ─────────────────────────────────────────
   GLOBAL CSS
───────────────────────────────────────── */
const CSS = `
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
  @keyframes spin   { to{transform:rotate(360deg)} }
  @keyframes shimmer {
    0%   { background-position:-200% 0; }
    100% { background-position:200% 0; }
  }
  @keyframes modalIn {
    from { opacity:0; transform:scale(0.94) translateY(12px); }
    to   { opacity:1; transform:scale(1) translateY(0); }
  }
  @keyframes glow-pulse {
    0%,100% { opacity:0.3; }
    50%      { opacity:0.6; }
  }

  .anim-fade-up  { animation: fadeUp 0.45s cubic-bezier(0.22,1,0.36,1) both; }
  .anim-fade-in  { animation: fadeIn 0.3s ease both; }
  .anim-modal-in { animation: modalIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both; }

  .skeleton {
    background: linear-gradient(90deg,#1c1b1b 25%,#2a2a2a 50%,#1c1b1b 75%);
    background-size: 200% 100%;
    animation: shimmer 1.6s infinite;
    border-radius: 6px;
  }

  .journal-card {
    background: linear-gradient(180deg,#121212 0%,#0e0e0e 100%);
    border: 1px solid rgba(37,179,23,0.07);
    border-radius: 12px;
    padding: 16px 18px;
    cursor: pointer;
    transition: border-color 0.2s, transform 0.18s, box-shadow 0.2s;
  }
  .journal-card:hover {
    border-color: rgba(37,179,23,0.25);
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(37,179,23,0.05);
  }

  .btn-primary {
    font-family: 'Manrope',sans-serif;
    font-size: 12px; font-weight: 800;
    letter-spacing: 0.8px; text-transform: uppercase;
    padding: 10px 20px; border-radius: 8px;
    background: #25b317; color: #023a00; border: none; cursor: pointer;
    display: flex; align-items: center; gap: 6px;
    transition: background 0.2s, box-shadow 0.2s, transform 0.15s;
  }
  .btn-primary:hover {
    background: #5be146;
    box-shadow: 0 0 20px rgba(37,179,23,0.35);
    transform: translateY(-1px);
  }
  .btn-primary:active { transform: scale(0.97); }

  .btn-ghost {
    font-family: 'Manrope',sans-serif;
    font-size: 12px; font-weight: 600;
    padding: 10px 18px; border-radius: 8px;
    background: #1c1b1b; color: #bdcbb4;
    border: 1px solid rgba(255,255,255,0.06); cursor: pointer;
    transition: border-color 0.2s, color 0.2s;
  }
  .btn-ghost:hover { border-color: rgba(37,179,23,0.2); color: #e5e2e1; }

  .btn-back {
    display: flex; align-items: center; gap: 6px;
    font-family: 'Manrope',sans-serif;
    font-size: 11px; font-weight: 700; letter-spacing: 0.5px;
    padding: 8px 14px; border-radius: 8px;
    background: rgba(179,37,23,0.08);
    border: 1px solid rgba(252,129,129,0.2);
    color: #fc8181; cursor: pointer;
    transition: background 0.2s, border-color 0.2s;
  }
  .btn-back:hover { background: rgba(252,129,129,0.12); border-color: rgba(252,129,129,0.35); }

  .ee-input, .ee-textarea {
    width: 100%;
    font-family: 'JetBrains Mono',monospace;
    font-size: 13px;
    padding: 11px 14px;
    background: #1c1b1b;
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 8px;
    color: #e5e2e1;
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .ee-input::placeholder, .ee-textarea::placeholder { color: #3e4a39; }
  .ee-input:focus, .ee-textarea:focus {
    border-color: rgba(37,179,23,0.5);
    box-shadow: 0 0 0 3px rgba(37,179,23,0.08);
  }
  /* native date/datetime picker dark fix */
  .ee-input[type="date"], .ee-input[type="datetime-local"] {
    color-scheme: dark;
  }
  .ee-textarea { resize: vertical; min-height: 80px; }

  ::-webkit-scrollbar { width: 3px; height: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #1c1b1b; border-radius: 4px; }
`;

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
function FormGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <label style={{
        display: "block",
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: "10px", fontWeight: 600,
        color: "#879580", letterSpacing: "1.2px",
        textTransform: "uppercase" as const,
        marginBottom: "7px",
      }}>{label}</label>
      {children}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{
      background: "linear-gradient(180deg,#121212 0%,#0e0e0e 100%)",
      border: "1px solid rgba(37,179,23,0.06)",
      borderRadius: "12px", padding: "16px 18px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
        <div>
          <div className="skeleton" style={{ width: "100px", height: "14px", marginBottom: "6px" }} />
          <div className="skeleton" style={{ width: "60px",  height: "10px" }} />
        </div>
        <div className="skeleton" style={{ width: "55px", height: "18px" }} />
      </div>
      <div className="skeleton" style={{ width: "180px", height: "10px", marginBottom: "5px" }} />
      <div className="skeleton" style={{ width: "140px", height: "10px" }} />
    </div>
  );
}

/* ─────────────────────────────────────────
   PAGE
───────────────────────────────────────── */
export default function JournalsPage() {
  const { id: accountId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [journals, setJournals] = useState<Journal[]>([]);
  const [loading, setLoading]   = useState(true);
  const [open, setOpen]         = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  const [form, setForm] = useState({
    script: "", date: "", entryTime: "", exitTime: "",
    pnl: "", entryReason: "", exitReason: "", quantity: "",
  });

  const resetForm = () => setForm({
    script: "", date: "", entryTime: "", exitTime: "",
    pnl: "", entryReason: "", exitReason: "", quantity: "",
  });

  /* ── fetch ── */
  const fetchJournals = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/accounts/${accountId}/journals`,
        { withCredentials: true }
      );
      if (res.data.success) setJournals(res.data.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchJournals(); }, [accountId]);

  /* ── create ── */
  const createJournal = async () => {
    if (!form.script.trim())   { setError("Script is required.");      return; }
    if (!form.date)            { setError("Date is required.");         return; }
    if (!form.entryTime)       { setError("Entry time is required.");   return; }
    if (!form.quantity)        { setError("Quantity is required.");     return; }
    if (!form.entryReason.trim()) { setError("Entry reason is required."); return; }
    setError("");
    try {
      setSaving(true);
      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/accounts/${accountId}/journals`,
        {
          script: form.script,
          date: new Date(form.date),
          entryTime: new Date(form.entryTime),
          exitTime: form.exitTime ? new Date(form.exitTime) : null,
          pnl: form.pnl ? Number(form.pnl) : null,
          entryReason: form.entryReason,
          exitReason: form.exitReason || null,
          quantity: Number(form.quantity),
        },
        { withCredentials: true }
      );
      setOpen(false);
      resetForm();
      fetchJournals();
    } catch { setError("Failed to create journal. Try again."); }
    finally { setSaving(false); }
  };

  const pnlColor = (pnl?: number) => (pnl ?? 0) >= 0 ? "#25b317" : "#fc8181";

  const labelStyle: React.CSSProperties = {
    fontFamily: "'JetBrains Mono',monospace",
    fontSize: "10px", fontWeight: 600,
    color: "#879580", letterSpacing: "1.2px",
    textTransform: "uppercase",
    marginBottom: "7px", display: "block",
  };

  return (
    <>
      <style>{CSS}</style>

      <div style={{ minHeight: "100vh", background: "#050505", fontFamily: "'Manrope',sans-serif", color: "#e5e2e1", position: "relative" }}>

        {/* Background grid */}
        <div style={{
          position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
          backgroundImage: `
            linear-gradient(rgba(37,179,23,0.025) 1px,transparent 1px),
            linear-gradient(90deg,rgba(37,179,23,0.025) 1px,transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }} />

        {/* Ambient glow */}
        <div style={{
          position: "fixed", top: "15%", left: "50%", transform: "translateX(-50%)",
          width: "600px", height: "200px", borderRadius: "50%",
          background: "radial-gradient(ellipse,rgba(37,179,23,0.04) 0%,transparent 70%)",
          pointerEvents: "none", zIndex: 0, animation: "glow-pulse 5s ease infinite",
        }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: "900px", margin: "0 auto", padding: "24px 20px" }}>

          {/* ── HEADER ── */}
          <header className="anim-fade-up" style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            paddingBottom: "20px", borderBottom: "1px solid #1c1b1b", marginBottom: "24px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{
                width: 34, height: 34, background: "#25b317", borderRadius: "8px",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "#023a00", fontVariationSettings: "'FILL' 1" }}>book</span>
              </div>
              <div>
                <div style={{ fontSize: "16px", fontWeight: 800, color: "#e5e2e1", letterSpacing: "-0.3px" }}>Trading Journals</div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: "#879580" }}>
                  {loading ? "Loading…" : `${journals.length} entr${journals.length !== 1 ? "ies" : "y"}`}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button className="btn-back" onClick={() => navigate(-1)}>
                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>arrow_back</span>
                Back
              </button>
              <button className="btn-primary" onClick={() => { resetForm(); setError(""); setOpen(true); }}>
                <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>add</span>
                New Journal
              </button>
            </div>
          </header>

          {/* ── LOADING SKELETONS ── */}
          {loading && (
            <div style={{ display: "flex", flexDirection: "column" as const, gap: "10px" }}>
              {[0,1,2,3].map(i => <SkeletonCard key={i} />)}
            </div>
          )}

          {/* ── EMPTY ── */}
          {!loading && journals.length === 0 && (
            <div className="anim-fade-in" style={{
              display: "flex", flexDirection: "column" as const, alignItems: "center",
              padding: "60px 20px", gap: "14px",
              border: "1px dashed rgba(37,179,23,0.15)", borderRadius: "14px",
              background: "rgba(37,179,23,0.02)",
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: "40px", color: "rgba(37,179,23,0.25)" }}>book</span>
              <div style={{ textAlign: "center" as const }}>
                <div style={{ fontSize: "15px", fontWeight: 700, color: "#bdcbb4", marginBottom: "6px" }}>No journals yet</div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", color: "#3e4a39" }}>Start documenting your trades to track patterns</div>
              </div>
              <button className="btn-primary" onClick={() => { resetForm(); setError(""); setOpen(true); }} style={{ marginTop: "4px" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>add</span>
                Create First Journal
              </button>
            </div>
          )}

          {/* ── JOURNAL LIST ── */}
          {!loading && journals.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column" as const, gap: "10px" }}>
              {journals.map((j, i) => (
                <div
                  key={j.id}
                  className={`journal-card anim-fade-up`}
                  style={{ animationDelay: `${i * 0.04}s` }}
                  onClick={() => navigate(`/accounts/${accountId}/journals/${j.id}`)}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: "10px" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: "14px", color: "#25b317" }}>receipt_long</span>
                        <span style={{ fontSize: "14px", fontWeight: 700, color: "#e5e2e1" }}>{j.script}</span>
                      </div>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: "#879580" }}>
                        Qty: {j.quantity}
                      </div>
                    </div>

                    {/* PnL badge */}
                    <div style={{
                      fontFamily: "'JetBrains Mono',monospace",
                      fontSize: "14px", fontWeight: 700,
                      color: pnlColor(j.pnl),
                      background: (j.pnl ?? 0) >= 0 ? "rgba(37,179,23,0.08)" : "rgba(179,37,23,0.08)",
                      border: `1px solid ${(j.pnl ?? 0) >= 0 ? "rgba(37,179,23,0.2)" : "rgba(252,129,129,0.2)"}`,
                      borderRadius: "7px", padding: "4px 10px", flexShrink: 0,
                    }}>
                      {(j.pnl ?? 0) >= 0 ? "+" : ""}${j.pnl ?? 0}
                    </div>
                  </div>

                  {/* Meta row */}
                  <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" as const, marginBottom: "10px" }}>
                    {[
                      { icon: "calendar_today", label: new Date(j.date).toLocaleDateString("en-US", { dateStyle: "medium" }) },
                      { icon: "login", label: new Date(j.entryTime).toLocaleTimeString("en-US", { timeStyle: "short" }) },
                      ...(j.exitTime ? [{ icon: "logout", label: new Date(j.exitTime).toLocaleTimeString("en-US", { timeStyle: "short" }) }] : []),
                    ].map((item, idx) => (
                      <div key={idx} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: "11px", color: "#3e4a39" }}>{item.icon}</span>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: "#879580" }}>{item.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Entry reason preview */}
                  {j.entryReason && (
                    <div style={{
                      fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", color: "#3e4a39",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const,
                      marginBottom: "8px",
                    }}>
                      {j.entryReason}
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: "#25b317", letterSpacing: "0.5px" }}>View details</span>
                    <span className="material-symbols-outlined" style={{ fontSize: "12px", color: "#25b317" }}>arrow_forward</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══════ MODAL: CREATE JOURNAL ═══════ */}
      {open && (
        <div
          className="anim-fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) { setOpen(false); resetForm(); } }}
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
          }}
        >
          <div className="anim-modal-in" style={{
            width: "100%", maxWidth: "460px",
            background: "linear-gradient(180deg,#1a1a1a 0%,#121212 100%)",
            border: "1px solid rgba(37,179,23,0.15)",
            borderRadius: "16px", padding: "28px",
            maxHeight: "90vh", overflowY: "auto",
            boxShadow: "0 40px 80px rgba(0,0,0,0.7), 0 0 40px rgba(37,179,23,0.04)",
          }}>

            {/* Modal header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "#25b317" }}>book</span>
                <span style={{ fontSize: "16px", fontWeight: 800, color: "#e5e2e1", letterSpacing: "-0.3px" }}>New Journal Entry</span>
              </div>
              <button
                onClick={() => { setOpen(false); resetForm(); }}
                style={{
                  width: 30, height: 30, background: "#1c1b1b",
                  border: "1px solid rgba(255,255,255,0.06)", borderRadius: "7px",
                  color: "#879580", cursor: "pointer", display: "flex",
                  alignItems: "center", justifyContent: "center",
                  fontFamily: "inherit", fontSize: "13px", transition: "all 0.2s",
                }}
              >✕</button>
            </div>

            {/* Error banner */}
            {error && (
              <div style={{
                marginBottom: "16px", padding: "10px 14px",
                background: "rgba(179,37,23,0.08)", border: "1px solid rgba(252,129,129,0.2)",
                borderRadius: "8px", display: "flex", alignItems: "center", gap: "8px",
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: "14px", color: "#fc8181", flexShrink: 0 }}>error</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", color: "#fc8181" }}>{error}</span>
              </div>
            )}

            {/* Row: script + quantity */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <FormGroup label="Script / Symbol">
                <input className="ee-input" placeholder="e.g. BTCUSD" value={form.script}
                  onChange={e => setForm({ ...form, script: e.target.value })} />
              </FormGroup>
              <FormGroup label="Quantity">
                <input className="ee-input" type="number" placeholder="e.g. 10" value={form.quantity}
                  onChange={e => setForm({ ...form, quantity: e.target.value })} />
              </FormGroup>
            </div>

            {/* Date */}
            <FormGroup label="Trade Date">
              <input className="ee-input" type="date" value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })} />
            </FormGroup>

            {/* Row: entry + exit time */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <FormGroup label="Entry Time">
                <input className="ee-input" type="datetime-local" value={form.entryTime}
                  onChange={e => setForm({ ...form, entryTime: e.target.value })} />
              </FormGroup>
              <FormGroup label="Exit Time (opt)">
                <input className="ee-input" type="datetime-local" value={form.exitTime}
                  onChange={e => setForm({ ...form, exitTime: e.target.value })} />
              </FormGroup>
            </div>

            {/* PnL */}
            <FormGroup label="PnL (USD)">
              <input className="ee-input" type="number" placeholder="e.g. 250.00" value={form.pnl}
                onChange={e => setForm({ ...form, pnl: e.target.value })} />
            </FormGroup>

            {/* Entry reason */}
            <FormGroup label="Entry Reason">
              <textarea className="ee-textarea" placeholder="Why did you enter this trade?" value={form.entryReason}
                onChange={e => setForm({ ...form, entryReason: e.target.value })} />
            </FormGroup>

            {/* Exit reason */}
            <FormGroup label="Exit Reason (opt)">
              <textarea className="ee-textarea" placeholder="Why did you exit?" value={form.exitReason}
                onChange={e => setForm({ ...form, exitReason: e.target.value })} style={{ minHeight: "64px" }} />
            </FormGroup>

            {/* Actions */}
            <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
              <button className="btn-primary" onClick={createJournal} disabled={saving}
                style={{ flex: 1, justifyContent: "center", opacity: saving ? 0.7 : 1 }}>
                {saving
                  ? <><span style={{ width: 13, height: 13, border: "2px solid rgba(2,58,0,0.3)", borderTop: "2px solid #023a00", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} />Saving…</>
                  : "Save Journal"
                }
              </button>
              <button className="btn-ghost" onClick={() => { setOpen(false); resetForm(); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}