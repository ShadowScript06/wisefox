import { prisma } from "../src/lib/prisma";


async function main() {
  await prisma.plan.createMany({
    data: [
      {
        name: "BASIC",
        price: 0,
        tradesPerDay: 3,
        maxAccounts: 1,
        journalsPerDay: 1,
        initialBalanceType: "FIXED",
        initialBalance: 1000,
        aiFeedbackEnabled: false,
        aiSummaryEnabled: false,
      },
      {
        name: "PRO",
        price: 999,
        tradesPerDay: 10,
        maxAccounts: 3,
        journalsPerDay: 3,
        initialBalanceType: "FIXED",
        initialBalance: 10000,
        aiFeedbackEnabled: false,
        aiSummaryEnabled: true,
      },
      {
        name: "PREMIUM",
        price: 1999,
        tradesPerDay: -1, // unlimited
        maxAccounts: -1,
        journalsPerDay: -1,
        initialBalanceType: "UNLIMITED",
        initialBalance: null,
        aiFeedbackEnabled: true,
        aiSummaryEnabled: true,
      },
    ],
    skipDuplicates: true,
  });

  console.log("Plans seeded successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });