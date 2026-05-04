-- CreateTable
CREATE TABLE "AiFeedback" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "summary" TEXT,
    "biggestWin" DOUBLE PRECISION,
    "biggestLoss" DOUBLE PRECISION,
    "totalJournals" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiFeedback_accountId_idx" ON "AiFeedback"("accountId");

-- AddForeignKey
ALTER TABLE "AiFeedback" ADD CONSTRAINT "AiFeedback_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
