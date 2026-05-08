-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('PENDING', 'TRIGGERED');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('LTE', 'GTE', 'ET');

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "status" "AlertStatus" NOT NULL,
    "TYPE" "AlertType" NOT NULL,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
