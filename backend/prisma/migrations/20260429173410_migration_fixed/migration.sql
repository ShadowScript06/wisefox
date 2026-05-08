/*
  Warnings:

  - A unique constraint covering the columns `[accountId,symbol,isOpen]` on the table `Position` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Position_accountId_symbol_key";

-- CreateIndex
CREATE UNIQUE INDEX "Position_accountId_symbol_isOpen_key" ON "Position"("accountId", "symbol", "isOpen");
