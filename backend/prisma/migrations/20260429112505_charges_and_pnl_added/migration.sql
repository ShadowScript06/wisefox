-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "charges" DOUBLE PRECISION,
ADD COLUMN     "netPnl" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Trade" ADD COLUMN     "charges" INTEGER;
