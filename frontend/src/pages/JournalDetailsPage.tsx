import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

/* ─────────────────────────────────────────
   TYPES
───────────────────────────────────────── */
interface Journal {
  id: string; accountId: string; date: string;
  entryTime: string; exitTime: string | null;
  pnl: number; entryReason: string; exitReason: string | null;
}
interface Note {
  id: string; content: string; createdAt: string; updatedAt: string;
}

/* ─────────────────────────────────────────
   GLOBAL CSS
───────────────────────────────────────── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@300;400;500;600&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin:0; padding:0; }
  body { -webkit-font-smoothing: antialiased; background: #050505; }

  .material-symbols-outlined {
    font-family: 'Material Symbols Outlined';
    font-variation-settings: 'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24;
    font-style: normal; line-height:1; letter-spacing:normal;
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
    50%      { opacity:0.6; }
  }
  @keyframes noteIn {
    from { opacity:0; transform:translateY(8px); }
    to   { opacity:1; transform:translateY(0); }
  }

  .anim-fade-up  { animation: fadeUp 0.45s cubic-bezier(0.22,1,0.36,1) both; }
  .anim-fade-in  { animation: fadeIn 0.3s ease both; }
  .anim-note-in  { animation: noteIn 0.3s cubic-bezier(0.22,1,0.36,1) both; }

  .skeleton {
    background: linear-gradient(90deg,#1c1b1b 25%,#2a2a2a 50%,#1c1b1b 75%);
    background-size: 200% 100%;
    animation: shimmer 1.6s infinite;
    border-radius: 6px;
  }

  .note-card {
    background: linear-gradient(180deg,#161616 0%,#111111 100%);
    border: 1px solid rgba(255,255,255,0.05);
    border-radius: 10px;
    padding: 14px 16px;
    transition: border-color 0.2s;
  }
  .note-card:hover { border-color: rgba(37,179,23,0.15); }

  .btn-primary {
    font-family: 'Manrope',sans-serif;
    font-size: 12px; font-weight: 800;
    letter-spacing: 0.8px; text-transform: uppercase;
    padding: 10px 18px; border-radius: 8px;
    background: #25b317; color: #023a00; border: none; cursor: pointer;
    display: flex; align-items: center; gap: 6px;
    transition: background 0.2s, box-shadow 0.2s, transform 0.15s;
  }
  .btn-primary:hover:not(:disabled) {
    background: #5be146;
    box-shadow: 0 0 20px rgba(37,179,23,0.35);
    transform: translateY(-1px);
  }
  .btn-primary:disabled { opacity:0.6; cursor:not-allowed; }

  .btn-ghost {
    font-family: 'Manrope',sans-serif;
    font-size: 11px; font-weight: 600;
    padding: 8px 14px; border-radius: 7px;
    background: #1c1b1b; color: #bdcbb4;
    border: 1px solid rgba(255,255,255,0.06); cursor: pointer;
    transition: border-color 0.2s, color 0.2s;
  }
  .btn-ghost:hover { border-color: rgba(37,179,23,0.2); color:#e5e2e1; }

  .btn-back {
    display:flex; align-items:center; gap:6px;
    font-family: 'Manrope',sans-serif;
    font-size:11px; font-weight:700; letter-spacing:0.5px;
    padding:8px 14px; border-radius:8px;
    background: rgba(179,37,23,0.08);
    border:1px solid rgba(252,129,129,0.2);
    color:#fc8181; cursor:pointer;
    transition:background 0.2s,border-color 0.2s;
  }
  .btn-back:hover { background:rgba(252,129,129,0.12); border-color:rgba(252,129,129,0.35); }

  .btn-icon {
    width:30px; height:30px;
    border-radius:7px; border:1px solid rgba(255,255,255,0.06);
    background:#1c1b1b; cursor:pointer;
    display:flex; align-items:center; justify-content:center;
    transition:all 0.2s;
  }
  .btn-icon:hover { border-color:rgba(37,179,23,0.25); }
  .btn-icon-red:hover { border-color:rgba(252,129,129,0.25) !important; }

  .ee-textarea {
    width:100%;
    font-family:'JetBrains Mono',monospace;
    font-size:13px;
    padding:12px 14px;
    background:#1c1b1b;
    border:1px solid rgba(255,255,255,0.06);
    border-radius:9px;
    color:#e5e2e1;
    outline:none;
    resize:vertical;
    min-height:90px;
    box-sizing:border-box;
    transition:border-color 0.2s, box-shadow 0.2s;
  }
  .ee-textarea::placeholder { color:#3e4a39; }
  .ee-textarea:focus {
    border-color:rgba(37,179,23,0.5);
    box-shadow:0 0 0 3px rgba(37,179,23,0.08);
  }
  .ee-textarea.editing {
    border-color:rgba(91,225,70,0.3);
    box-shadow:0 0 0 3px rgba(91,225,70,0.06);
    min-height:70px;
  }

  ::-webkit-scrollbar { width:3px; height:3px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:#1c1b1b; border-radius:4px; }
`;

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
function InfoRow({ icon, label, value, valueColor }: {
  icon: string; label: string; value: string; valueColor?: string;
}) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", padding:"10px 0", borderBottom:"1px solid #1c1b1b", gap:"12px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:"6px", flexShrink:0 }}>
        <span className="material-symbols-outlined" style={{ fontSize:"13px", color:"#3e4a39" }}>{icon}</span>
        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"10px", color:"#879580", letterSpacing:"1px", textTransform:"uppercase" as const }}>{label}</span>
      </div>
      <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"12px", color: valueColor || "#e5e2e1", fontWeight:500, textAlign:"right" as const, maxWidth:"65%" }}>{value}</span>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div style={{ maxWidth:"860px", margin:"0 auto", padding:"24px 20px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"24px" }}>
        <div className="skeleton" style={{ width:80, height:34, borderRadius:8 }} />
        <div className="skeleton" style={{ width:140, height:34, borderRadius:8 }} />
      </div>
      <div style={{ background:"linear-gradient(180deg,#121212 0%,#0e0e0e 100%)", border:"1px solid rgba(37,179,23,0.08)", borderRadius:12, padding:"20px", marginBottom:20 }}>
        <div className="skeleton" style={{ width:80,  height:10, marginBottom:10 }} />
        <div className="skeleton" style={{ width:140, height:28, marginBottom:16 }} />
        <div className="skeleton" style={{ width:"100%", height:10, marginBottom:6 }} />
        <div className="skeleton" style={{ width:"80%",  height:10 }} />
      </div>
      {[0,1,2].map(i => (
        <div key={i} style={{ background:"#161616", border:"1px solid rgba(255,255,255,0.05)", borderRadius:10, padding:"14px 16px", marginBottom:8 }}>
          <div className="skeleton" style={{ width:"90%", height:10, marginBottom:6 }} />
          <div className="skeleton" style={{ width:"60%", height:10 }} />
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────
   PAGE
───────────────────────────────────────── */
export default function JournalDetailPage() {
  const { id, journalId } = useParams<{ id: string; journalId: string }>();
  const navigate = useNavigate();

  const [journal, setJournal]             = useState<Journal | null>(null);
  const [notes, setNotes]                 = useState<Note[]>([]);
  const [loading, setLoading]             = useState(true);
  const [newNote, setNewNote]             = useState("");
  const [addingNote, setAddingNote]       = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editValue, setEditValue]         = useState("");
  const [deletingId, setDeletingId]       = useState<string | null>(null);

  /* ── fetch ── */
  useEffect(() => {
    if (!id || !journalId) return;
    async function fetchData() {
      try {
        const [jr, nr] = await Promise.all([
          axios.get(`${import.meta.env.VITE_BACKEND_URL}/accounts/${id}/journals/${journalId}`, { withCredentials: true }),
          axios.get(`${import.meta.env.VITE_BACKEND_URL}/accounts/${id}/journals/${journalId}/notes`, { withCredentials: true }),
        ]);
        if (jr.data.success) setJournal(jr.data.data);
        if (nr.data.success) setNotes(nr.data.data);
      } catch { /* silent */ }
      finally { setLoading(false); }
    }
    fetchData();
  }, [id, journalId]);

  /* ── add note ── */
  async function handleAddNote() {
    if (!newNote.trim()) return;
    try {
      setAddingNote(true);
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/accounts/${id}/journals/${journalId}/notes`,
        { content: newNote }, { withCredentials: true }
      );
      if (res.data.success) { setNotes(prev => [res.data.data, ...prev]); setNewNote(""); }
    } catch { /* silent */ }
    finally { setAddingNote(false); }
  }

  /* ── delete note ── */
  async function handleDelete(noteId: string) {
    try {
      setDeletingId(noteId);
      const res = await axios.delete(
        `${import.meta.env.VITE_BACKEND_URL}/accounts/${id}/journals/${journalId}/notes/${noteId}`,
        { withCredentials: true }
      );
      if (res.data.success) setNotes(prev => prev.filter(n => n.id !== noteId));
    } catch { /* silent */ }
    finally { setDeletingId(null); }
  }

  /* ── edit note ── */
  function startEdit(note: Note) { setEditingNoteId(note.id); setEditValue(note.content); }

  async function saveEdit(noteId: string) {
    const res = await axios.put(
      `${import.meta.env.VITE_BACKEND_URL}/accounts/${id}/journals/${journalId}/notes/${noteId}`,
      { content: editValue }, { withCredentials: true }
    );
    if (res.data.success) {
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, content: editValue } : n));
      setEditingNoteId(null);
    }
  }

  /* ── guards ── */
  if (loading) return (
    <>
      <style>{CSS}</style>
      <div style={{ minHeight:"100vh", background:"#050505", fontFamily:"'Manrope',sans-serif" }}>
        <LoadingSkeleton />
      </div>
    </>
  );

  if (!journal) return (
    <>
      <style>{CSS}</style>
      <div style={{ minHeight:"100vh", background:"#050505", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column" as const, gap:14 }}>
        <div style={{ width:56, height:56, borderRadius:"50%", background:"rgba(179,37,23,0.1)", border:"1px solid rgba(252,129,129,0.2)", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span className="material-symbols-outlined" style={{ fontSize:"24px", color:"#fc8181" }}>error</span>
        </div>
        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"13px", color:"#879580" }}>Journal not found</span>
        <button className="btn-back" onClick={() => navigate(-1)}>
          <span className="material-symbols-outlined" style={{ fontSize:"14px" }}>arrow_back</span>Back
        </button>
      </div>
    </>
  );

  const pnlPos   = journal.pnl >= 0;
  const pnlColor = pnlPos ? "#25b317" : "#fc8181";

  return (
    <>
      <style>{CSS}</style>

      <div style={{ minHeight:"100vh", background:"#050505", fontFamily:"'Manrope',sans-serif", color:"#e5e2e1", position:"relative" }}>

        {/* bg grid */}
        <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, backgroundImage:`linear-gradient(rgba(37,179,23,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(37,179,23,0.025) 1px,transparent 1px)`, backgroundSize:"40px 40px" }} />
        <div style={{ position:"fixed", top:"15%", left:"50%", transform:"translateX(-50%)", width:"500px", height:"180px", borderRadius:"50%", background:"radial-gradient(ellipse,rgba(37,179,23,0.04) 0%,transparent 70%)", pointerEvents:"none", zIndex:0, animation:"glow-pulse 5s ease infinite" }} />

        <div style={{ position:"relative", zIndex:1, maxWidth:"860px", margin:"0 auto", padding:"24px 20px" }}>

          {/* ── HEADER ── */}
          <header className="anim-fade-up" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", paddingBottom:"20px", borderBottom:"1px solid #1c1b1b", marginBottom:"24px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
              <div style={{ width:34, height:34, background:"#25b317", borderRadius:"8px", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <span className="material-symbols-outlined" style={{ fontSize:"18px", color:"#023a00", fontVariationSettings:"'FILL' 1" }}>book</span>
              </div>
              <div>
                <div style={{ fontSize:"16px", fontWeight:800, color:"#e5e2e1", letterSpacing:"-0.3px" }}>Journal Detail</div>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"10px", color:"#879580" }}>
                  {new Date(journal.date).toLocaleDateString("en-US", { dateStyle:"long" })}
                </div>
              </div>
            </div>
            <button className="btn-back" onClick={() => navigate(`/accounts/${id}/journals`)}>
              <span className="material-symbols-outlined" style={{ fontSize:"14px" }}>arrow_back</span>
              Back
            </button>
          </header>

          <div style={{ display:"grid", gridTemplateColumns:"300px 1fr", gap:"20px", alignItems:"start" }}>

            {/* ── LEFT: JOURNAL INFO ── */}
            <div className="anim-fade-up" style={{ animationDelay:"0.05s" }}>

              {/* PnL hero card */}
              <div style={{
                background:`linear-gradient(135deg, ${pnlPos ? "rgba(37,179,23,0.08)" : "rgba(179,37,23,0.08)"} 0%, #0e0e0e 100%)`,
                border:`1px solid ${pnlPos ? "rgba(37,179,23,0.2)" : "rgba(252,129,129,0.2)"}`,
                borderRadius:"12px", padding:"20px",
                marginBottom:"14px", textAlign:"center" as const,
                position:"relative", overflow:"hidden",
              }}>
                <div style={{ position:"absolute", top:-24, right:-24, width:80, height:80, borderRadius:"50%", background:pnlColor, opacity:0.06, pointerEvents:"none" }} />
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"10px", color:"#879580", letterSpacing:"1px", textTransform:"uppercase" as const, marginBottom:"8px" }}>Realized PnL</div>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"32px", fontWeight:700, color:pnlColor, letterSpacing:"-1px", lineHeight:1 }}>
                  {pnlPos ? "+" : ""}${journal.pnl.toFixed(2)}
                </div>
              </div>

              {/* Info panel */}
              <div style={{ background:"linear-gradient(180deg,#121212 0%,#0e0e0e 100%)", border:"1px solid rgba(37,179,23,0.08)", borderRadius:"12px", padding:"16px 18px" }}>
                <div style={{ fontFamily:"'Manrope',sans-serif", fontSize:"11px", fontWeight:700, color:"#879580", letterSpacing:"1.2px", textTransform:"uppercase" as const, marginBottom:"4px" }}>Trade Info</div>

                <InfoRow icon="calendar_today" label="Date"
                  value={new Date(journal.date).toLocaleDateString("en-US", { dateStyle:"medium" })} />
                <InfoRow icon="login" label="Entry"
                  value={new Date(journal.entryTime).toLocaleTimeString("en-US", { timeStyle:"short" })} />
                {journal.exitTime && (
                  <InfoRow icon="logout" label="Exit"
                    value={new Date(journal.exitTime).toLocaleTimeString("en-US", { timeStyle:"short" })} />
                )}

                {/* Entry reason */}
                <div style={{ paddingTop:"12px", marginTop:"4px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"6px", marginBottom:"6px" }}>
                    <span className="material-symbols-outlined" style={{ fontSize:"13px", color:"#25b317" }}>arrow_circle_right</span>
                    <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"10px", color:"#25b317", letterSpacing:"1px", textTransform:"uppercase" as const }}>Entry Reason</span>
                  </div>
                  <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"12px", color:"#bdcbb4", lineHeight:1.7 }}>{journal.entryReason}</p>
                </div>

                {/* Exit reason */}
                {journal.exitReason && (
                  <div style={{ paddingTop:"12px", marginTop:"8px", borderTop:"1px solid #1c1b1b" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"6px", marginBottom:"6px" }}>
                      <span className="material-symbols-outlined" style={{ fontSize:"13px", color:"#fc8181" }}>arrow_circle_left</span>
                      <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"10px", color:"#fc8181", letterSpacing:"1px", textTransform:"uppercase" as const }}>Exit Reason</span>
                    </div>
                    <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"12px", color:"#bdcbb4", lineHeight:1.7 }}>{journal.exitReason}</p>
                  </div>
                )}
              </div>
            </div>

            {/* ── RIGHT: NOTES ── */}
            <div className="anim-fade-up" style={{ animationDelay:"0.1s" }}>

              {/* Add note area */}
              <div style={{ background:"linear-gradient(180deg,#121212 0%,#0e0e0e 100%)", border:"1px solid rgba(37,179,23,0.08)", borderRadius:"12px", padding:"16px 18px", marginBottom:"14px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"12px" }}>
                  <span className="material-symbols-outlined" style={{ fontSize:"15px", color:"#25b317" }}>edit_note</span>
                  <span style={{ fontFamily:"'Manrope',sans-serif", fontSize:"11px", fontWeight:700, color:"#879580", letterSpacing:"1.2px", textTransform:"uppercase" as const }}>Add Note</span>
                </div>
                <textarea
                  className="ee-textarea"
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="Write an observation, reminder, or lesson learned…"
                  onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAddNote(); }}
                />
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:"10px" }}>
                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"9px", color:"#3e4a39" }}>Ctrl+Enter to save</span>
                  <button className="btn-primary" onClick={handleAddNote} disabled={addingNote || !newNote.trim()}>
                    {addingNote
                      ? <><span style={{ width:12, height:12, border:"2px solid rgba(2,58,0,0.3)", borderTop:"2px solid #023a00", borderRadius:"50%", animation:"spin 0.8s linear infinite", display:"inline-block" }} />Saving…</>
                      : <><span className="material-symbols-outlined" style={{ fontSize:"14px" }}>add</span>Add Note</>
                    }
                  </button>
                </div>
              </div>

              {/* Notes list header */}
              <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"10px" }}>
                <span className="material-symbols-outlined" style={{ fontSize:"15px", color:"#25b317" }}>sticky_note_2</span>
                <span style={{ fontFamily:"'Manrope',sans-serif", fontSize:"11px", fontWeight:700, color:"#879580", letterSpacing:"1.2px", textTransform:"uppercase" as const }}>Notes</span>
                <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"10px", background:"rgba(37,179,23,0.1)", color:"#25b317", padding:"2px 7px", borderRadius:"4px", border:"1px solid rgba(37,179,23,0.2)" }}>
                  {notes.length}
                </span>
              </div>

              {/* Empty notes */}
              {notes.length === 0 && (
                <div className="anim-fade-in" style={{ display:"flex", flexDirection:"column" as const, alignItems:"center", padding:"40px 20px", gap:"10px", border:"1px dashed rgba(37,179,23,0.1)", borderRadius:"10px", background:"rgba(37,179,23,0.02)" }}>
                  <span className="material-symbols-outlined" style={{ fontSize:"28px", color:"rgba(37,179,23,0.2)" }}>sticky_note_2</span>
                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"11px", color:"#879580" }}>No notes yet. Add your first observation above.</span>
                </div>
              )}

              {/* Notes */}
              <div style={{ display:"flex", flexDirection:"column" as const, gap:"8px" }}>
                {notes.map((note, i) => (
                  <div key={note.id} className="note-card anim-note-in" style={{ animationDelay:`${i * 0.04}s` }}>
                    {editingNoteId === note.id ? (
                      /* ── EDIT MODE ── */
                      <>
                        <textarea
                          className="ee-textarea editing"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onKeyDown={e => { if (e.key === "Escape") setEditingNoteId(null); }}
                          autoFocus
                        />
                        <div style={{ display:"flex", gap:"8px", marginTop:"10px" }}>
                          <button className="btn-primary" onClick={() => saveEdit(note.id)}
                            style={{ padding:"8px 14px", fontSize:"11px" }}>
                            <span className="material-symbols-outlined" style={{ fontSize:"13px" }}>check</span>Save
                          </button>
                          <button className="btn-ghost" onClick={() => setEditingNoteId(null)}
                            style={{ padding:"8px 12px", fontSize:"11px" }}>Cancel</button>
                        </div>
                      </>
                    ) : (
                      /* ── VIEW MODE ── */
                      <>
                        <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"12px", color:"#bdcbb4", lineHeight:1.75, marginBottom:"10px", whiteSpace:"pre-wrap" as const }}>
                          {note.content}
                        </p>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                          <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"9px", color:"#3e4a39" }}>
                            {new Date(note.createdAt).toLocaleString("en-US", { dateStyle:"short", timeStyle:"short" })}
                            {note.updatedAt !== note.createdAt ? " · edited" : ""}
                          </span>
                          <div style={{ display:"flex", gap:"6px" }}>
                            <button className="btn-icon" onClick={() => startEdit(note)} title="Edit">
                              <span className="material-symbols-outlined" style={{ fontSize:"14px", color:"#5be146" }}>edit</span>
                            </button>
                            <button
                              className="btn-icon btn-icon-red"
                              onClick={() => handleDelete(note.id)}
                              disabled={deletingId === note.id}
                              title="Delete"
                              style={{ opacity: deletingId === note.id ? 0.5 : 1 }}
                            >
                              {deletingId === note.id
                                ? <span style={{ width:12, height:12, border:"2px solid rgba(252,129,129,0.3)", borderTop:"2px solid #fc8181", borderRadius:"50%", animation:"spin 0.8s linear infinite", display:"inline-block" }} />
                                : <span className="material-symbols-outlined" style={{ fontSize:"14px", color:"#fc8181" }}>delete</span>
                              }
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}