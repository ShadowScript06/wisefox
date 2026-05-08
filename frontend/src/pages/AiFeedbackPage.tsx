import { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";

/* ─────────────────────────────────────────
   TYPES
───────────────────────────────────────── */
type AiFeedback = {
  id: string;
  summary: string;
  biggestWin: number;
  biggestLoss: number;
  content: {
    insights: {
      winPatterns: string[];
      lossPatterns: string[];
      mistakes: string[];
      strengths: string[];
      habits: string[];
    };
    psychology: {
      disciplineScore: number;
      emotionalTrading: string;
      consistency: string;
    };
    riskAnalysis: {
      overLeverage: boolean;
      stopLossUsage: string;
      riskRewardBehavior: string;
    };
    suggestions: string[];
    tradingRules: string[];
  };
};

/* ─────────────────────────────────────────
   GLOBAL CSS
───────────────────────────────────────── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@300;400;500;600&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  body { -webkit-font-smoothing:antialiased; background:#050505; }

  .material-symbols-outlined {
    font-family:'Material Symbols Outlined';
    font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24;
    font-style:normal; line-height:1; letter-spacing:normal;
    text-transform:none; white-space:nowrap; word-wrap:normal;
    direction:ltr; -webkit-font-smoothing:antialiased; user-select:none;
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
  @keyframes glow-pulse {
    0%,100% { opacity:0.3; }
    50%      { opacity:0.55; }
  }
  @keyframes ai-scan {
    0%   { transform:translateY(-100%); opacity:0.6; }
    100% { transform:translateY(400%);  opacity:0; }
  }
  @keyframes score-fill {
    from { width:0%; }
    to   { width:var(--score-w); }
  }

  .anim-fade-up { animation: fadeUp 0.45s cubic-bezier(0.22,1,0.36,1) both; }
  .anim-fade-in { animation: fadeIn 0.3s ease both; }

  .skeleton {
    background: linear-gradient(90deg,#1c1b1b 25%,#2a2a2a 50%,#1c1b1b 75%);
    background-size:200% 100%;
    animation:shimmer 1.6s infinite;
    border-radius:6px;
  }

  .ee-panel {
    background: linear-gradient(180deg,#121212 0%,#0e0e0e 100%);
    border: 1px solid rgba(37,179,23,0.08);
    border-radius: 12px;
    overflow: hidden;
    transition: border-color 0.2s;
  }
  .ee-panel:hover { border-color: rgba(37,179,23,0.16); }

  .list-item-ee {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 9px 0;
    border-bottom: 1px solid #1a1a1a;
    transition: background 0.15s;
  }
  .list-item-ee:last-child { border-bottom: none; padding-bottom: 0; }

  .btn-generate {
    font-family:'Manrope',sans-serif;
    font-size:12px; font-weight:800;
    letter-spacing:0.8px; text-transform:uppercase;
    padding:11px 22px; border-radius:9px;
    background:#25b317; color:#023a00; border:none; cursor:pointer;
    display:flex; align-items:center; gap:8px;
    transition:background 0.2s, box-shadow 0.2s, transform 0.15s;
    position:relative; overflow:hidden;
  }
  .btn-generate:hover:not(:disabled) {
    background:#5be146;
    box-shadow:0 0 24px rgba(37,179,23,0.4);
    transform:translateY(-1px);
  }
  .btn-generate:disabled { opacity:0.6; cursor:not-allowed; }
  .btn-generate::after {
    content:'';
    position:absolute; left:0; top:0;
    width:100%; height:2px;
    background:linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent);
  }

  .btn-back {
    display:flex; align-items:center; gap:6px;
    font-family:'Manrope',sans-serif;
    font-size:11px; font-weight:700; letter-spacing:0.5px;
    padding:8px 14px; border-radius:8px;
    background:rgba(179,37,23,0.08);
    border:1px solid rgba(252,129,129,0.2);
    color:#fc8181; cursor:pointer;
    transition:background 0.2s,border-color 0.2s;
  }
  .btn-back:hover { background:rgba(252,129,129,0.12); border-color:rgba(252,129,129,0.35); }

  .score-bar-fill {
    height:100%;
    border-radius:4px;
    background:linear-gradient(90deg,#25b317,#5be146);
    animation:score-fill 1.2s cubic-bezier(0.22,1,0.36,1) both;
    animation-delay:0.4s;
  }

  /* AI scanning line */
  .ai-scan-line {
    position:absolute; left:0; right:0; height:2px;
    background:linear-gradient(90deg,transparent,rgba(37,179,23,0.6),transparent);
    animation:ai-scan 1.8s ease-in-out infinite;
    pointer-events:none;
  }

  ::-webkit-scrollbar { width:3px; height:3px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:#1c1b1b; border-radius:4px; }

  @media (max-width:768px) {
    .ai-2col { grid-template-columns:1fr !important; }
    .ai-4col { grid-template-columns:1fr 1fr !important; }
  }
`;

/* ─────────────────────────────────────────
   SUB COMPONENTS
───────────────────────────────────────── */
function PanelHeader({ icon, title, badge }: { icon: string; title: string; badge?: string }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 18px", borderBottom:"1px solid #1c1b1b" }}>
      <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
        <span className="material-symbols-outlined" style={{ fontSize:"15px", color:"#25b317" }}>{icon}</span>
        <span style={{ fontFamily:"'Manrope',sans-serif", fontSize:"11px", fontWeight:700, color:"#879580", letterSpacing:"1.2px", textTransform:"uppercase" as const }}>{title}</span>
      </div>
      {badge && (
        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"10px", background:"rgba(37,179,23,0.1)", color:"#25b317", padding:"2px 8px", borderRadius:"4px", border:"1px solid rgba(37,179,23,0.2)" }}>{badge}</span>
      )}
    </div>
  );
}

function ItemList({ items, accent }: { items: string[]; accent?: string }) {
  const color = accent || "#bdcbb4";
  const dot   = accent === "#fc8181" ? "#fc8181" : accent === "#fbbf24" ? "#fbbf24" : "#25b317";
  return (
    <div style={{ padding:"4px 0" }}>
      {(items || []).map((item, i) => (
        <div key={i} className="list-item-ee">
          <div style={{ width:5, height:5, borderRadius:"50%", background:dot, flexShrink:0, marginTop:5 }} />
          <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"12px", color, lineHeight:1.7 }}>{item}</span>
        </div>
      ))}
      {(!items || items.length === 0) && (
        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"11px", color:"#3e4a39" }}>No data available.</span>
      )}
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? "#25b317" : score >= 45 ? "#fbbf24" : "#fc8181";
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"8px" }}>
        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"10px", color:"#879580", letterSpacing:"0.8px" }}>DISCIPLINE SCORE</span>
        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"16px", fontWeight:700, color }}>{score}/100</span>
      </div>
      <div style={{ height:6, borderRadius:4, background:"#1c1b1b", overflow:"hidden", position:"relative" }}>
        <div
          className="score-bar-fill"
          style={{ "--score-w": `${score}%` } as React.CSSProperties}
        />
      </div>
    </div>
  );
}

function InfoPill({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div style={{ background:"#1c1b1b", border:"1px solid rgba(255,255,255,0.05)", borderRadius:"9px", padding:"12px 14px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:"5px", marginBottom:"6px" }}>
        <span className="material-symbols-outlined" style={{ fontSize:"12px", color:"#25b317" }}>{icon}</span>
        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"9px", color:"#879580", letterSpacing:"1px", textTransform:"uppercase" as const }}>{label}</span>
      </div>
      <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"12px", color:"#bdcbb4", lineHeight:1.6 }}>{value}</span>
    </div>
  );
}

function SkeletonPage() {
  return (
    <div style={{ maxWidth:"1080px", margin:"0 auto", padding:"24px 20px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"24px" }}>
        <div className="skeleton" style={{ width:200, height:34, borderRadius:8 }} />
        <div className="skeleton" style={{ width:180, height:40, borderRadius:9 }} />
      </div>
      <div className="skeleton" style={{ width:"100%", height:90, borderRadius:12, marginBottom:16 }} />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:14, marginBottom:16 }}>
        {[0,1,2,3].map(i => <div key={i} className="skeleton" style={{ height:80, borderRadius:12 }} />)}
      </div>
      {[0,1,2,3].map(i => <div key={i} className="skeleton" style={{ height:120, borderRadius:12, marginBottom:12 }} />)}
    </div>
  );
}

/* ─────────────────────────────────────────
   GENERATING OVERLAY
───────────────────────────────────────── */
function GeneratingOverlay() {
  return (
    <div style={{
      display:"flex", flexDirection:"column" as const, alignItems:"center",
      justifyContent:"center", padding:"60px 20px", gap:"20px",
      background:"linear-gradient(180deg,#121212 0%,#0e0e0e 100%)",
      border:"1px solid rgba(37,179,23,0.15)", borderRadius:"12px",
      position:"relative", overflow:"hidden",
    }}>
      <div className="ai-scan-line" />
      <div style={{ width:48, height:48, borderRadius:"50%", background:"rgba(37,179,23,0.08)", border:"1px solid rgba(37,179,23,0.2)", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <span className="material-symbols-outlined" style={{ fontSize:"24px", color:"#25b317", fontVariationSettings:"'FILL' 1" }}>psychology</span>
      </div>
      <div style={{ textAlign:"center" as const }}>
        <div style={{ fontFamily:"'Manrope',sans-serif", fontSize:"15px", fontWeight:800, color:"#e5e2e1", marginBottom:"6px" }}>Analyzing Your Trades…</div>
        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"11px", color:"#879580" }}>AI is reviewing patterns, psychology & risk behavior</div>
      </div>
      <div style={{ display:"flex", gap:"6px" }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ width:6, height:6, borderRadius:"50%", background:"#25b317", animation:`glow-pulse 1.2s ease ${i * 0.3}s infinite` }} />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   PAGE
───────────────────────────────────────── */
export default function AiFeedbackPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [feedback,   setFeedback]   = useState<AiFeedback | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error,      setError]      = useState("");

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/accounts/${id}/ai-feedback`,
        { withCredentials: true }
      );
      if (res.data.success) setFeedback(res.data.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchFeedback(); }, [id]);

  const generateFeedback = async () => {
    try {
      setGenerating(true); setError("");
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/accounts/${id}/ai-feedback/generate`,
        {}, { withCredentials: true }
      );
      if (res.data.success) setFeedback(res.data.data);
    } catch { setError("Failed to generate AI feedback. Try again."); }
    finally { setGenerating(false); }
  };

  if (loading) return (
    <>
      <style>{CSS}</style>
      <div style={{ minHeight:"100vh", background:"#050505" }}><SkeletonPage /></div>
    </>
  );

  return (
    <>
      <style>{CSS}</style>

      <div style={{ minHeight:"100vh", background:"#050505", fontFamily:"'Manrope',sans-serif", color:"#e5e2e1", position:"relative" }}>

        {/* bg */}
        <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, backgroundImage:`linear-gradient(rgba(37,179,23,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(37,179,23,0.025) 1px,transparent 1px)`, backgroundSize:"40px 40px" }} />
        <div style={{ position:"fixed", top:"10%", left:"50%", transform:"translateX(-50%)", width:"700px", height:"220px", borderRadius:"50%", background:"radial-gradient(ellipse,rgba(37,179,23,0.05) 0%,transparent 70%)", pointerEvents:"none", zIndex:0, animation:"glow-pulse 5s ease infinite" }} />

        <div style={{ position:"relative", zIndex:1, maxWidth:"1080px", margin:"0 auto", padding:"24px 20px" }}>

          {/* ── HEADER ── */}
          <header className="anim-fade-up" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", paddingBottom:"20px", borderBottom:"1px solid #1c1b1b", marginBottom:"24px", flexWrap:"wrap" as const, gap:"12px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
              <div style={{ width:34, height:34, background:"#25b317", borderRadius:"8px", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <span className="material-symbols-outlined" style={{ fontSize:"18px", color:"#023a00", fontVariationSettings:"'FILL' 1" }}>psychology</span>
              </div>
              <div>
                <div style={{ fontSize:"16px", fontWeight:800, color:"#e5e2e1", letterSpacing:"-0.3px" }}>AI Trading Coach</div>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"10px", color:"#879580" }}>
                  {feedback ? "Analysis ready" : "No analysis yet"}
                </div>
              </div>
            </div>
            <div style={{ display:"flex", gap:"10px", alignItems:"center" }}>
              <button className="btn-back" onClick={() => navigate(-1)}>
                <span className="material-symbols-outlined" style={{ fontSize:"14px" }}>arrow_back</span>Back
              </button>
              <button className="btn-generate" onClick={generateFeedback} disabled={generating}>
                {generating ? (
                  <><span style={{ width:13, height:13, border:"2px solid rgba(2,58,0,0.3)", borderTop:"2px solid #023a00", borderRadius:"50%", animation:"spin 0.8s linear infinite", display:"inline-block" }} />Analyzing…</>
                ) : (
                  <><span className="material-symbols-outlined" style={{ fontSize:"15px" }}>auto_awesome</span>
                  {feedback ? "Regenerate" : "Generate Insight"}</>
                )}
              </button>
            </div>
          </header>

          {/* Error */}
          {error && (
            <div className="anim-fade-in" style={{ marginBottom:"16px", padding:"11px 14px", background:"rgba(179,37,23,0.08)", border:"1px solid rgba(252,129,129,0.2)", borderRadius:"9px", display:"flex", alignItems:"center", gap:"8px" }}>
              <span className="material-symbols-outlined" style={{ fontSize:"14px", color:"#fc8181", flexShrink:0 }}>error</span>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"11px", color:"#fc8181" }}>{error}</span>
            </div>
          )}

          {/* Generating overlay */}
          {generating && <GeneratingOverlay />}

          {/* Empty */}
          {!generating && !feedback && (
            <div className="anim-fade-in" style={{ display:"flex", flexDirection:"column" as const, alignItems:"center", padding:"80px 20px", gap:"16px", border:"1px dashed rgba(37,179,23,0.12)", borderRadius:"14px", background:"rgba(37,179,23,0.02)" }}>
              <div style={{ width:64, height:64, borderRadius:"50%", background:"rgba(37,179,23,0.06)", border:"1px solid rgba(37,179,23,0.15)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span className="material-symbols-outlined" style={{ fontSize:"30px", color:"rgba(37,179,23,0.4)", fontVariationSettings:"'FILL' 1" }}>psychology</span>
              </div>
              <div style={{ textAlign:"center" as const }}>
                <div style={{ fontSize:"15px", fontWeight:700, color:"#bdcbb4", marginBottom:"6px" }}>No AI Analysis Yet</div>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"11px", color:"#3e4a39" }}>Generate your first insight to unlock trading patterns</div>
              </div>
              <button className="btn-generate" onClick={generateFeedback}>
                <span className="material-symbols-outlined" style={{ fontSize:"15px" }}>auto_awesome</span>Generate First Insight
              </button>
            </div>
          )}

          {/* ── FEEDBACK CONTENT ── */}
          {!generating && feedback && (
            <div style={{ display:"flex", flexDirection:"column" as const, gap:"16px" }}>

              {/* Summary */}
              <div className="ee-panel anim-fade-up" style={{ animationDelay:"0s" }}>
                <PanelHeader icon="summarize" title="Summary" />
                <div style={{ padding:"16px 18px" }}>
                  <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"13px", color:"#bdcbb4", lineHeight:1.8 }}>{feedback.summary}</p>
                </div>
              </div>

              {/* Big numbers */}
              <div className="ai-4col" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"14px" }}>
                {[
                  { label:"Biggest Win",  value:`+$${feedback.biggestWin}`,  color:"#25b317", icon:"trending_up",   bg:"rgba(37,179,23,0.08)",  border:"rgba(37,179,23,0.18)" },
                  { label:"Biggest Loss", value:`-$${Math.abs(feedback.biggestLoss)}`, color:"#fc8181", icon:"trending_down", bg:"rgba(179,37,23,0.08)", border:"rgba(252,129,129,0.18)" },
                  { label:"Discipline",   value:`${feedback.content.psychology.disciplineScore}/100`, color:"#fbbf24", icon:"military_tech", bg:"rgba(251,191,36,0.08)", border:"rgba(251,191,36,0.18)" },
                  { label:"Over-Leverage",value: feedback.content.riskAnalysis.overLeverage ? "Yes ⚠" : "No ✓", color: feedback.content.riskAnalysis.overLeverage ? "#fc8181" : "#25b317", icon:"warning", bg: feedback.content.riskAnalysis.overLeverage ? "rgba(179,37,23,0.08)" : "rgba(37,179,23,0.08)", border: feedback.content.riskAnalysis.overLeverage ? "rgba(252,129,129,0.18)" : "rgba(37,179,23,0.18)" },
                ].map((s, i) => (
                  <div key={i} className="anim-fade-up" style={{ animationDelay:`${0.06 * i}s`, background:`linear-gradient(180deg,#121212 0%,#0e0e0e 100%)`, border:`1px solid ${s.border}`, borderRadius:"12px", padding:"16px 18px", position:"relative", overflow:"hidden" }}>
                    <div style={{ position:"absolute", top:-18, right:-18, width:60, height:60, borderRadius:"50%", background:s.color, opacity:0.06, pointerEvents:"none" }} />
                    <div style={{ display:"flex", alignItems:"center", gap:"5px", marginBottom:"8px" }}>
                      <span className="material-symbols-outlined" style={{ fontSize:"13px", color:s.color }}>{s.icon}</span>
                      <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"9px", color:"#879580", letterSpacing:"1px", textTransform:"uppercase" as const }}>{s.label}</span>
                    </div>
                    <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"20px", fontWeight:700, color:s.color, letterSpacing:"-0.5px" }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Psychology + Risk side by side */}
              <div className="ai-2col" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px" }}>

                {/* Psychology */}
                <div className="ee-panel anim-fade-up" style={{ animationDelay:"0.1s" }}>
                  <PanelHeader icon="psychology" title="Psychology" />
                  <div style={{ padding:"16px 18px", display:"flex", flexDirection:"column" as const, gap:"14px" }}>
                    <ScoreBar score={feedback.content.psychology.disciplineScore} />
                    <InfoPill icon="mood" label="Emotional Trading" value={feedback.content.psychology.emotionalTrading} />
                    <InfoPill icon="sync" label="Consistency" value={feedback.content.psychology.consistency} />
                  </div>
                </div>

                {/* Risk */}
                <div className="ee-panel anim-fade-up" style={{ animationDelay:"0.14s" }}>
                  <PanelHeader icon="shield" title="Risk Analysis" />
                  <div style={{ padding:"16px 18px", display:"flex", flexDirection:"column" as const, gap:"10px" }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 12px", background:"#1c1b1b", borderRadius:"8px", border:"1px solid rgba(255,255,255,0.04)" }}>
                      <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"10px", color:"#879580", letterSpacing:"0.8px" }}>OVER LEVERAGE</span>
                      <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"12px", fontWeight:700, color: feedback.content.riskAnalysis.overLeverage ? "#fc8181" : "#25b317" }}>
                        {feedback.content.riskAnalysis.overLeverage ? "⚠ Yes" : "✓ No"}
                      </span>
                    </div>
                    <InfoPill icon="gpp_maybe" label="Stop Loss Usage" value={feedback.content.riskAnalysis.stopLossUsage} />
                    <InfoPill icon="balance" label="Risk / Reward" value={feedback.content.riskAnalysis.riskRewardBehavior} />
                  </div>
                </div>
              </div>

              {/* Insights 2-col grid */}
              <div className="ai-2col" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px" }}>
                {[
                  { icon:"trending_up",   title:"Win Patterns",  items:feedback.content.insights.winPatterns,  accent:"#25b317", delay:"0.16s" },
                  { icon:"trending_down", title:"Loss Patterns", items:feedback.content.insights.lossPatterns, accent:"#fc8181", delay:"0.20s" },
                  { icon:"emoji_objects", title:"Strengths",     items:feedback.content.insights.strengths,    accent:"#5be146", delay:"0.24s" },
                  { icon:"error_outline", title:"Mistakes",      items:feedback.content.insights.mistakes,     accent:"#fbbf24", delay:"0.28s" },
                ].map((s, i) => (
                  <div key={i} className="ee-panel anim-fade-up" style={{ animationDelay:s.delay }}>
                    <PanelHeader icon={s.icon} title={s.title} badge={`${(s.items || []).length}`} />
                    <div style={{ padding:"14px 18px" }}>
                      <ItemList items={s.items} accent={s.accent} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Habits full width */}
              <div className="ee-panel anim-fade-up" style={{ animationDelay:"0.32s" }}>
                <PanelHeader icon="repeat" title="Habits" badge={`${(feedback.content.insights.habits || []).length}`} />
                <div style={{ padding:"14px 18px" }}>
                  <ItemList items={feedback.content.insights.habits} />
                </div>
              </div>

              {/* Suggestions + Trading Rules side by side */}
              <div className="ai-2col" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px" }}>
                <div className="ee-panel anim-fade-up" style={{ animationDelay:"0.36s" }}>
                  <PanelHeader icon="tips_and_updates" title="Suggestions" badge={`${(feedback.content.suggestions || []).length}`} />
                  <div style={{ padding:"14px 18px" }}>
                    <ItemList items={feedback.content.suggestions} accent="#5be146" />
                  </div>
                </div>
                <div className="ee-panel anim-fade-up" style={{ animationDelay:"0.40s" }}>
                  <PanelHeader icon="rule" title="Trading Rules" badge={`${(feedback.content.tradingRules || []).length}`} />
                  <div style={{ padding:"14px 18px" }}>
                    <ItemList items={feedback.content.tradingRules} accent="#fbbf24" />
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </>
  );
}