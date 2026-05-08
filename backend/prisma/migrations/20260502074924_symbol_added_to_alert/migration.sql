/*
  Warnings:

  - You are about to drop the column `TYPE` on the `Alert` table. All the data in the column will be lost.
  - Added the required column `symbol` to the `Alert` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Alert` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Alert" DROP COLUMN "TYPE",
ADD COLUMN     "symbol" TEXT NOT NULL,
ADD COLUMN     "type" "AlertType" NOT NULL;
