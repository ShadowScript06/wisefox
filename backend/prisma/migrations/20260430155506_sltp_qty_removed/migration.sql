/*
  Warnings:

  - You are about to drop the column `slQty` on the `Position` table. All the data in the column will be lost.
  - You are about to drop the column `tpQty` on the `Position` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Position" DROP COLUMN "slQty",
DROP COLUMN "tpQty";
