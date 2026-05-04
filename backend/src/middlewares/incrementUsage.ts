import { prisma } from "../lib/prisma";

export const incrementUsage = async (
  userId: string,
  type: "TRADE" | "JOURNAL" | "ACCOUNT"
) => {
  const today = new Date().toISOString().split("T")[0];

  const usage = await prisma.dailyUsage.findFirst({
    where: {
      userId,
      date: today,
    },
  });

  if (usage) {
    return prisma.dailyUsage.update({
      where: {
        id: usage.id,
      },
      data: {
        tradesCount:
          type === "TRADE" ? usage.tradesCount + 1 : usage.tradesCount,

        journalsCount:
          type === "JOURNAL" ? usage.journalsCount + 1 : usage.journalsCount,
      },
    });
  }

  return prisma.dailyUsage.create({
    data: {
      userId,
      date: today,
      tradesCount: type === "TRADE" ? 1 : 0,
      journalsCount: type === "JOURNAL" ? 1 : 0,
      accountsCount: type === "ACCOUNT" ? 1 : 0,
    },
  });
};