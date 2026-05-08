-- AlterTable
ALTER TABLE "Trade" ADD COLUMN     "trigger" TEXT,
ALTER COLUMN "orderId" DROP NOT NULL;
