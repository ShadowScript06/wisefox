import { useMemo, useState } from "react"

type HeatmapRow = {
  date: string
  trades: number
  pnl: number
}

type Props = {
  data: HeatmapRow[]
}

/* ---------------- UI CONFIG ---------------- */

const CELL = 11
const GAP = 3

// only show important anchors (clean SaaS style)
const DAYS = [
  { label: "Mon", show: true },
  { label: "", show: false },
  { label: "Wed", show: true },
  { label: "", show: false },
  { label: "Fri", show: true },
  { label: "", show: false },
  { label: "", show: false }
]

/* ---------------- COMPONENT ---------------- */

export function Heatmap({ data }: Props) {
  const [mode, setMode] = useState<"trades" | "pnl">("trades")

  /* ---------------- map ---------------- */
  const map = useMemo(() => {
    const m = new Map<string, HeatmapRow>()
    data.forEach(d => m.set(d.date, d))
    return m
  }, [data])

  /* ---------------- generate 365 days (Monday aligned) ---------------- */
  const days = useMemo(() => {
    const res: { date: string; value?: HeatmapRow }[] = []

    const today = new Date()
    const start = new Date(today)
    start.setDate(today.getDate() - 364)

    for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
      const iso = new Date(d).toISOString().split("T")[0]

      res.push({
        date: iso,
        value: map.get(iso)
      })
    }

    return res
  }, [map])

  /* ---------------- weeks ---------------- */
  const weeks = useMemo(() => {
    const w: typeof days[] = []
    let cur: typeof days = []

    days.forEach(d => {
      cur.push(d)
      if (cur.length === 7) {
        w.push(cur)
        cur = []
      }
    })

    if (cur.length) w.push(cur)

    return w
  }, [days])

  /* ---------------- color system (soft premium) ---------------- */
  function color(v?: HeatmapRow) {
    if (!v) return "bg-[#141824]"

    if (mode === "trades") {
      const t = v.trades || 0
      if (t === 0) return "bg-[#141824]"
      if (t < 2) return "bg-blue-500/10"
      if (t < 5) return "bg-blue-500/20"
      if (t < 10) return "bg-blue-500/30"
      return "bg-blue-500/40"
    }

    const p = v.pnl || 0
    if (p === 0) return "bg-[#141824]"

    if (p > 0) {
      if (p < 100) return "bg-emerald-500/10"
      if (p < 500) return "bg-emerald-500/20"
      return "bg-emerald-500/30"
    }

    if (p > -100) return "bg-rose-500/10"
    if (p > -500) return "bg-rose-500/20"
    return "bg-rose-500/30"
  }

  /* ---------------- UI ---------------- */
  return (
    <div className="w-full text-white">

      {/* toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode("trades")}
          className={`px-3 py-1 text-sm rounded-md transition ${
            mode === "trades"
              ? "bg-blue-600"
              : "bg-[#141824] text-gray-400"
          }`}
        >
          Trades
        </button>

        <button
          onClick={() => setMode("pnl")}
          className={`px-3 py-1 text-sm rounded-md transition ${
            mode === "pnl"
              ? "bg-emerald-600"
              : "bg-[#141824] text-gray-400"
          }`}
        >
          PnL
        </button>
      </div>

      {/* grid container */}
      <div className="flex gap-2 overflow-x-auto">

        {/* days (clean labels) */}
        <div className="flex flex-col text-[10px] text-gray-500 pr-2">
          {DAYS.map((d, i) => (
            <div
              key={i}
              style={{ height: CELL + GAP }}
              className="flex items-center"
            >
              {d.show ? d.label : ""}
            </div>
          ))}
        </div>

        {/* heatmap grid */}
        <div className="flex gap-[2px]">

          {weeks.map((w, wi) => (
            <div key={wi} className="flex flex-col gap-[2px]">

              {w.map((d, di) => (
                <div
                  key={di}
                  className={`rounded-[2px] transition-all duration-150 hover:scale-125 hover:z-10 ${color(d.value)}`}
                  style={{
                    width: CELL,
                    height: CELL
                  }}
                  title={`${d.date} | trades: ${d.value?.trades ?? 0} | pnl: ${d.value?.pnl ?? 0}`}
                />
              ))}

            </div>
          ))}

        </div>
      </div>

      {/* legend */}
      <div className="flex items-center gap-2 mt-4 text-[10px] text-gray-500">
        <span>Less</span>

        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className={`w-3 h-3 rounded-sm ${
              mode === "trades"
                ? ["bg-[#141824]", "bg-blue-500/10", "bg-blue-500/25", "bg-blue-500/40"][i - 1]
                : ["bg-[#141824]", "bg-rose-500/10", "bg-emerald-500/20", "bg-emerald-500/40"][i - 1]
            }`}
          />
        ))}

        <span>More</span>
      </div>

    </div>
  )
}