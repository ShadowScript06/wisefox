/*
  Warnings:

  - You are about to drop the column `closedAt` on the `Order` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "closedAt";

-- AlterTable
ALTER TABLE "Position" ADD COLUMN     "closedAt" TIMESTAMP(3);
