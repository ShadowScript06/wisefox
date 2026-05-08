-- DropForeignKey
ALTER TABLE "Journal" DROP CONSTRAINT "Journal_accountId_fkey";

-- AddForeignKey
ALTER TABLE "Journal" ADD CONSTRAINT "Journal_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
