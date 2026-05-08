/*
  Warnings:

  - You are about to drop the column `positionId` on the `Trade` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[accountId,symbol]` on the table `Position` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Trade" DROP CONSTRAINT "Trade_positionId_fkey";

-- DropIndex
DROP INDEX "Position_accountId_symbol_isOpen_key";

-- AlterTable
ALTER TABLE "Trade" DROP COLUMN "positionId";

-- CreateIndex
CREATE UNIQUE INDEX "Position_accountId_symbol_key" ON "Position"("accountId", "symbol");
