import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";

type Journal = {
  id: string;
  script: string;
  date: string;
  entryTime: string;
  exitTime?: string;
  pnl?: number;
  entryReason: string;
  exitReason?: string;
  quantity: number;
};

export default function JournalsPage() {
  const { id: accountId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [journals, setJournals] = useState<Journal[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);

  const [form, setForm] = useState({
    script: "",
    date: "",
    entryTime: "",
    exitTime: "",
    pnl: "",
    entryReason: "",
    exitReason: "",
    quantity: "",
  });

  // ─── FETCH ─────────────────────────────
  const fetchJournals = async () => {
    try {
      setLoading(true);

      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/accounts/${accountId}/journals`,
        { withCredentials: true }
      );

      if (res.data.success) {
        setJournals(res.data.data);
      }
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJournals();
  }, [accountId]);

  // ─── CREATE ─────────────────────────────
  const createJournal = async () => {
    try {
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
      setForm({
        script: "",
        date: "",
        entryTime: "",
        exitTime: "",
        pnl: "",
        entryReason: "",
        exitReason: "",
        quantity: "",
      });

      fetchJournals();
    } catch (err) {
      alert("Failed to create journal");
    }
  };

  // ─── UI ─────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold">📊 Trading Journals</h1>

        <button
          onClick={() => setOpen(true)}
          className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-medium"
        >
          + New Journal
        </button>
      </div>

      {/* LOADING */}
      {loading && (
        <p className="text-zinc-400">Loading journals...</p>
      )}

      {/* EMPTY */}
      {!loading && journals.length === 0 && (
        <div className="text-center py-10 border border-white/10 rounded-xl bg-white/5">
          <p className="text-white font-medium">No journals found</p>
          <p className="text-zinc-500 text-sm mt-1">
            Start journaling your trades
          </p>
        </div>
      )}

      {/* LIST */}
      <div className="grid gap-3">
        {journals.map((j) => (
          <div
            key={j.id}
            onClick={() =>
              navigate(`/accounts/${accountId}/journals/${j.id}`)
            }
            className="cursor-pointer rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-white font-semibold">
                  {j.script}
                </h3>
                <p className="text-xs text-zinc-500">
                  Qty: {j.quantity}
                </p>
              </div>

              <p
                className={`text-sm font-semibold ${
                  (j.pnl ?? 0) >= 0
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                ${j.pnl ?? 0}
              </p>
            </div>

            <div className="mt-2 text-xs text-zinc-500 space-y-1">
              <p>
                Date:{" "}
                {new Date(j.date).toLocaleDateString()}
              </p>
              <p>
                Entry:{" "}
                {new Date(j.entryTime).toLocaleTimeString()}
              </p>
              {j.exitTime && (
                <p>
                  Exit:{" "}
                  {new Date(j.exitTime).toLocaleTimeString()}
                </p>
              )}
            </div>

            <p className="text-xs text-cyan-400 mt-2">
              Click to view details →
            </p>
          </div>
        ))}
      </div>

      {/* ─── MODAL ───────────────────────────── */}
      {open && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center">
          <div className="bg-[#11131a] border border-white/10 p-6 rounded-xl w-[420px] max-h-[90vh] overflow-y-auto">

            <h2 className="text-lg font-semibold mb-4">
              New Journal
            </h2>

            <input
              placeholder="Script"
              className="w-full mb-2 p-2 rounded bg-white/5 border border-white/10"
              value={form.script}
              onChange={(e) =>
                setForm({ ...form, script: e.target.value })
              }
            />

            <input
              type="date"
              className="w-full mb-2 p-2 rounded bg-white/5 border border-white/10"
              value={form.date}
              onChange={(e) =>
                setForm({ ...form, date: e.target.value })
              }
            />

            <input
              type="datetime-local"
              className="w-full mb-2 p-2 rounded bg-white/5 border border-white/10"
              value={form.entryTime}
              onChange={(e) =>
                setForm({ ...form, entryTime: e.target.value })
              }
            />

            <input
              type="datetime-local"
              className="w-full mb-2 p-2 rounded bg-white/5 border border-white/10"
              value={form.exitTime}
              onChange={(e) =>
                setForm({ ...form, exitTime: e.target.value })
              }
            />

            <input
              placeholder="PnL"
              className="w-full mb-2 p-2 rounded bg-white/5 border border-white/10"
              value={form.pnl}
              onChange={(e) =>
                setForm({ ...form, pnl: e.target.value })
              }
            />

            <input
              placeholder="Quantity"
              className="w-full mb-2 p-2 rounded bg-white/5 border border-white/10"
              value={form.quantity}
              onChange={(e) =>
                setForm({ ...form, quantity: e.target.value })
              }
            />

            <textarea
              placeholder="Entry Reason"
              className="w-full mb-2 p-2 rounded bg-white/5 border border-white/10"
              value={form.entryReason}
              onChange={(e) =>
                setForm({ ...form, entryReason: e.target.value })
              }
            />

            <textarea
              placeholder="Exit Reason"
              className="w-full mb-2 p-2 rounded bg-white/5 border border-white/10"
              value={form.exitReason}
              onChange={(e) =>
                setForm({ ...form, exitReason: e.target.value })
              }
            />

            <div className="flex gap-2 mt-3">
              <button
                onClick={createJournal}
                className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-black py-2 rounded-lg font-medium"
              >
                Save
              </button>

              <button
                onClick={() => setOpen(false)}
                className="flex-1 bg-white/10 hover:bg-white/20 py-2 rounded-lg"
              >
                Cancel
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}