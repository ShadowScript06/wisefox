/*
  Warnings:

  - Added the required column `type` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "orderType" AS ENUM ('MARKET', 'LIMIT');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "type" "orderType" NOT NULL;
