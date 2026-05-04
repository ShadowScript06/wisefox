import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

interface Journal {
  id: string;
  accountId: string;
  date: string;
  entryTime: string;
  exitTime: string | null;
  pnl: number;
  entryReason: string;
  exitReason: string | null;
}

interface Note {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export default function JournalDetailPage() {
  const { id, journalId } = useParams<{ id: string; journalId: string }>();
  const navigate = useNavigate();

  const [journal, setJournal] = useState<Journal | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  const [newNote, setNewNote] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // ─── Fetch journal + notes ─────────────────────────────
  useEffect(() => {
    if (!id || !journalId) return;

    async function fetchData() {
      try {
        const [journalRes, notesRes] = await Promise.all([
          axios.get(
            `${import.meta.env.VITE_BACKEND_URL}/accounts/${id}/journals/${journalId}`,
            { withCredentials: true }
          ),
          axios.get(
            `${import.meta.env.VITE_BACKEND_URL}/accounts/${id}/journals/${journalId}/notes`,
            { withCredentials: true }
          ),
        ]);

        if (journalRes.data.success) setJournal(journalRes.data.data);
        if (notesRes.data.success) setNotes(notesRes.data.data);
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id, journalId]);

  // ─── Create Note ─────────────────────────────
  async function handleAddNote() {
    if (!newNote.trim()) return;

    const res = await axios.post(
      `${import.meta.env.VITE_BACKEND_URL}/accounts/${id}/journals/${journalId}/notes`,
      { content: newNote },
      { withCredentials: true }
    );

    if (res.data.success) {
      setNotes((prev) => [res.data.data, ...prev]);
      setNewNote("");
    }
  }

  // ─── Delete Note ─────────────────────────────
  async function handleDelete(noteId: string) {
    const res = await axios.delete(
      `${import.meta.env.VITE_BACKEND_URL}/accounts/${id}/journals/${journalId}/notes/${noteId}`,
      { withCredentials: true }
    );

    if (res.data.success) {
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    }
  }

  // ─── Start Edit ─────────────────────────────
  function startEdit(note: Note) {
    setEditingNoteId(note.id);
    setEditValue(note.content);
  }

  // ─── Save Edit ─────────────────────────────
  async function saveEdit(noteId: string) {
    const res = await axios.put(
      `${import.meta.env.VITE_BACKEND_URL}/accounts/${id}/journals/${journalId}/notes/${noteId}`,
      { content: editValue },
      { withCredentials: true }
    );

    if (res.data.success) {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === noteId ? { ...n, content: editValue } : n
        )
      );
      setEditingNoteId(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }

  if (!journal) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white">
        Journal not found
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white px-6 py-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => navigate(`/accounts/${id}/journals`)}
          className="px-3 py-1.5 text-sm rounded-lg bg-white/5 hover:bg-white/10 border border-white/10"
        >
          ← Back
        </button>

        <h1 className="text-lg font-semibold">Journal Detail</h1>
      </div>

      {/* Journal Info */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
        <p className="text-sm text-zinc-400">PnL</p>
        <p className={`text-xl font-bold ${journal.pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
          ${journal.pnl}
        </p>

        <div className="mt-3 text-sm text-zinc-400 space-y-1">
          <p>Entry: {journal.entryReason}</p>
          <p>Exit: {journal.exitReason ?? "-"}</p>
        </div>
      </div>

      {/* Add Note */}
      <div className="mb-6">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Write a note..."
          className="w-full p-3 rounded-xl bg-white/5 border border-white/10 outline-none"
        />
        <button
          onClick={handleAddNote}
          className="mt-2 px-4 py-2 bg-cyan-500 text-black rounded-lg font-medium"
        >
          Add Note
        </button>
      </div>

      {/* Notes List */}
      <div className="space-y-3">
        {notes.map((note) => (
          <div
            key={note.id}
            className="p-4 rounded-xl bg-white/5 border border-white/10"
          >
            {editingNoteId === note.id ? (
              <>
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full p-2 bg-black/30 rounded-lg border border-white/10"
                />

                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => saveEdit(note.id)}
                    className="px-3 py-1 bg-green-500 text-black rounded-lg"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingNoteId(null)}
                    className="px-3 py-1 bg-white/10 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-zinc-300">{note.content}</p>

                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => startEdit(note)}
                    className="px-3 py-1 text-xs bg-white/10 rounded-lg"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="px-3 py-1 text-xs bg-red-500/20 text-red-400 rounded-lg"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}