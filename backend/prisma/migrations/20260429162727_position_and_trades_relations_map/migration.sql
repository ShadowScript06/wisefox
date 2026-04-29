-- AlterTable
ALTER TABLE "Trade" ADD COLUMN     "positionId" TEXT;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE;
