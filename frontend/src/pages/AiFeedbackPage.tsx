import { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";

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

export default function AiFeedbackPage() {
  const { id } = useParams();

  const [feedback, setFeedback] = useState<AiFeedback | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // ---------------- FETCH ----------------
  const fetchFeedback = async () => {
    try {
      setLoading(true);

      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/accounts/${id}/ai-feedback`,
        { withCredentials: true }
      );

      if (res.data.success) {
        setFeedback(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, [id]);

  // ---------------- GENERATE ----------------
  const generateFeedback = async () => {
    try {
      setGenerating(true);

      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/accounts/${id}/ai-feedback/generate`,
        {},
        { withCredentials: true }
      );

      if (res.data.success) {
        setFeedback(res.data.data);
      }
    } catch (err) {
      alert("Failed to generate AI feedback");
    } finally {
      setGenerating(false);
    }
  };

  // ---------------- UI ----------------
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">🧠 AI Trading Coach</h1>

        <button
          onClick={generateFeedback}
          disabled={generating}
          className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold transition disabled:opacity-50"
        >
          {generating ? "Analyzing..." : "Generate AI Feedback"}
        </button>
      </div>

      {/* Loading */}
      {loading && <p className="text-zinc-400">Loading analysis...</p>}

      {/* Empty */}
      {!loading && !feedback && (
        <div className="text-center mt-20">
          <p className="text-zinc-500 mb-4">
            No AI analysis yet for this account
          </p>
          <button
            onClick={generateFeedback}
            className="px-5 py-2 rounded-xl bg-cyan-500 text-black font-semibold"
          >
            Generate First Insight
          </button>
        </div>
      )}

      {/* CONTENT */}
      {feedback && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <h2 className="text-lg font-semibold mb-2">📊 Summary</h2>
            <p className="text-zinc-300">{feedback.summary}</p>
          </div>

          {/* Wins / Loss */}
          <div className="grid md:grid-cols-2 gap-4">
            <StatCard label="Biggest Win" value={`$${feedback.biggestWin}`} color="green" />
            <StatCard label="Biggest Loss" value={`$${feedback.biggestLoss}`} color="red" />
          </div>

          {/* Psychology */}
          <Section title="🧠 Psychology">
            <p>Discipline Score: <b>{feedback.content.psychology.disciplineScore}/100</b></p>
            <p>Emotional Trading: {feedback.content.psychology.emotionalTrading}</p>
            <p>Consistency: {feedback.content.psychology.consistency}</p>
          </Section>

          {/* Insights */}
          <Section title="📉 Loss Patterns">
            <List items={feedback.content.insights.lossPatterns} />
          </Section>

          <Section title="📈 Win Patterns">
            <List items={feedback.content.insights.winPatterns} />
          </Section>

          <Section title="⚠️ Mistakes">
            <List items={feedback.content.insights.mistakes} />
          </Section>

          <Section title="💪 Strengths">
            <List items={feedback.content.insights.strengths} />
          </Section>

          <Section title="🔁 Habits">
            <List items={feedback.content.insights.habits} />
          </Section>

          {/* Risk */}
          <Section title="⚠️ Risk Analysis">
            <p>Over Leverage: {feedback.content.riskAnalysis.overLeverage ? "Yes" : "No"}</p>
            <p>Stop Loss Usage: {feedback.content.riskAnalysis.stopLossUsage}</p>
            <p>Risk/Reward: {feedback.content.riskAnalysis.riskRewardBehavior}</p>
          </Section>

          {/* Suggestions */}
          <Section title="🎯 Suggestions">
            <List items={feedback.content.suggestions} />
          </Section>

          {/* Trading Rules */}
          <Section title="📌 Trading Rules to Follow">
            <List items={feedback.content.tradingRules} />
          </Section>
        </div>
      )}
    </div>
  );
}


function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "green" | "red";
}) {
  return (
    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
      <p className="text-zinc-400 text-sm">{label}</p>
      <p
        className={`text-xl font-bold ${
          color === "green" ? "text-green-400" : "text-red-400"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
      <h2 className="text-lg font-semibold mb-3">{title}</h2>
      <div className="text-zinc-300 space-y-2">{children}</div>
    </div>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="list-disc pl-5 space-y-1">
      {items?.map((item, i) => (
        <li key={i} className="text-zinc-300">
          {item}
        </li>
      ))}
    </ul>
  );
}