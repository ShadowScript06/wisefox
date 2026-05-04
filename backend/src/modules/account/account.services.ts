import { prisma } from "../../lib/prisma";
import { removeAccount, upsertAccount } from "../../utils/cache/accountCache";


import axios from "axios";
import subscritionServices from "../subscription/subscriptions.services";
import { response } from "express";

const client = axios.create({
  baseURL: "https://openrouter.ai/api/v1",
  headers: {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
  },
});

type HeatmapRow = {
  date: string
  trades: number
  pnl:number
}

type AccountOverviewResponse = {
  summary: {
    totalTrades: number
    totalPnl: number
    totalCharges: number
    winRate: number
    profitableTrades: number
    losingTrades: number
  }

  heatmap: {
    startDate: string
    endDate: string
    data: HeatmapRow[]
  }
}

const createAccount = async (name: string, balance: number, userId: string) => {
  const accountCount = await prisma.account.count({
  where: { userId },
});

const plan= await subscritionServices.getActivePlan(userId);


if (accountCount >= plan.maxAccounts) {
  return response.status(403).json({
    message: "Account limit reached",
  });
}
  const account = await prisma.account.create({
    data: {
      name,
      balance,
      userId,
    },
  });

  upsertAccount(account);

  

  return account;
};

const getAllAccounts = async (userId: string) => {
  const accounts = await prisma.account.findMany({
    where: {
      userId,
    },
  });

  return accounts;
};

const getAccountById = async (userId: string, accountId: string) => {
  const account = await prisma.account.findUnique({
    where: {
      userId,
      id: accountId,
    },
  });

  return account;
};

const deleteAccount = async (userId: string, accountId: string) => {
  const account = await prisma.account.delete({
    where: {
      userId,
      id: accountId,
    },
  });

  removeAccount(accountId);

  return account;
};

function getDateRange(days: number): string[] {
  const dates: string[] = []
  const today = new Date()

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(today.getDate() - i)
    dates.push(d.toISOString().split("T")[0])
  }

  return dates
}

async function getAccountOverview(accountId: string): Promise<AccountOverviewResponse> {

    const account=await prisma.account.findUnique({
        where:{
            id:accountId
        }
    });

  const [trades, positions] = await Promise.all([
    prisma.trade.findMany({
      where: { accountId },
      select: { createdAt: true },
    }),

    prisma.position.findMany({
      where: {
        accountId,
        isOpen: false,
      },
      select: {
        realizedPnl: true,
        updatedAt: true, // or closedAt if you add it
      },
    }),
  ])

  // -------------------------
  // 1. TRADE COUNT
  // -------------------------
  const tradeMap = new Map<string, number>()

  for (const t of trades) {
    const date = t.createdAt.toISOString().split("T")[0]
    tradeMap.set(date, (tradeMap.get(date) || 0) + 1)
  }

  // -------------------------
  // 2. PnL + WIN RATE STATS
  // -------------------------
  let totalPnl = 0
  let profitable = 0
  let losing = 0

  const pnlMap = new Map<string, number>()

  for (const p of positions) {
    const date = p.updatedAt.toISOString().split("T")[0]

    totalPnl += p.realizedPnl

    if (p.realizedPnl > 0) profitable++
    else losing++

    pnlMap.set(date, (pnlMap.get(date) || 0) + p.realizedPnl)
  }

  const totalTrades = trades.length
  const winRate = totalTrades === 0 ? 0 : (profitable / totalTrades) * 100

  // -------------------------
  // 3. FULL CALENDAR (365 days)
  // -------------------------
  const allDates = getDateRange(365)

  const heatmap = allDates.map((date) => ({
    date,
    trades: tradeMap.get(date) || 0,
    pnl: pnlMap.get(date) || 0,
  }))

  // -------------------------
  // 4. RETURN FINAL OBJECT
  // -------------------------
  return {
    summary: {
      totalTrades,
      totalPnl,
      totalCharges: account?.charges||0, // plug later from charges table
      winRate,
      profitableTrades: profitable,
      losingTrades: losing,
    },
    heatmap: {
      startDate: allDates[0],
      endDate: allDates[allDates.length - 1],
      data: heatmap,
    },
  }
}


 const generateAiFeedbackForAccount = async (accountId: string) => {
  const journals = await prisma.journal.findMany({
    where: { accountId },
    include: { notes: true },
  });

  const previous = await prisma.aiFeedback.findFirst({
    where: { accountId },
    orderBy: { createdAt: "desc" },
  });

  const structuredData = journals.map((j) => ({
    script: j.script,
    pnl: j.pnl,
    entryReason: j.entryReason,
    exitReason: j.exitReason,
    quantity: j.quantity,
    notes: j.notes.map((n) => n.content),
  }));

  const prompt = `
You are a professional trading performance analyst and hedge fund coach.

Analyze this trader's complete journal history.

JOURNALS:
${JSON.stringify(structuredData)}

PREVIOUS FEEDBACK:
${JSON.stringify(previous?.content ?? {})}

---

STRICT OUTPUT RULES:
- Return ONLY valid JSON
- NO markdown
- NO explanation
- NO null values
- ALWAYS include all fields

---

OUTPUT FORMAT:

{
  "biggestWin": number,
  "biggestLoss": number,

  "summary": "string",

  "insights": {
    "winPatterns": ["string"],
    "lossPatterns": ["string"],
    "mistakes": ["string"],
    "strengths": ["string"],
    "habits": ["string"]
  },

  "psychology": {
    "disciplineScore": number,
    "emotionalTrading": "string",
    "consistency": "string"
  },

  "riskAnalysis": {
    "overLeverage": boolean,
    "stopLossUsage": "string",
    "riskRewardBehavior": "string"
  },

  "suggestions": ["string"],
  "tradingRules": ["string"]
}

---

RULES:
- disciplineScore = 0 to 100
- be brutally honest
- identify repeated mistakes
- prioritize behavioral patterns over numbers
`;

  const response = await client.post("/chat/completions", {
    model: "openai/gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `
You are STRICT JSON generator.

You ONLY return valid JSON.
If failure → return {}

No markdown, no explanation.
        `,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.4,
  });

  const content = response.data.choices[0].message.content;

  // 🧹 clean output
  const clean = content.replace(/```json|```/g, "").trim();

  let parsed;

  try {
    parsed = JSON.parse(clean);
  } catch (err) {
    console.error("AI RAW OUTPUT:", content);
    throw new Error("Invalid AI JSON response");
  }

  // 🔒 validation
  if (!parsed.summary || !parsed.insights) {
    throw new Error("AI returned invalid structure");
  }

  // 💾 store
  return prisma.aiFeedback.create({
    data: {
      accountId,
      content: parsed,
      summary: parsed.summary,
      biggestWin: parsed.biggestWin,
      biggestLoss: parsed.biggestLoss,
      totalJournals: journals.length,
    },
  });
};


const getAiFeedback=async(accountId:string)=>{
    const feedback=await prisma.aiFeedback.findFirst({
        where:{
            accountId
        },orderBy:{
            createdAt:'desc'
        }
    })

     if (!feedback) {
    return null; // or throw new Error("No feedback found")
  }
    return feedback;
}


const accountServices = {
  createAccount,
  getAllAccounts,
  getAccountById,
  deleteAccount,
  getAccountOverview,
  generateAiFeedbackForAccount,
  getAiFeedback
};

export default accountServices;
