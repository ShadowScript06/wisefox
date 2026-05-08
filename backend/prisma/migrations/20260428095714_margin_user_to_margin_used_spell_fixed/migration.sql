/*
  Warnings:

  - You are about to drop the column `marginUser` on the `Account` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Account" DROP COLUMN "marginUser",
ADD COLUMN     "marginUsed" DOUBLE PRECISION NOT NULL DEFAULT 0;
