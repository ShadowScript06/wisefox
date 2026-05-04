/*
  Warnings:

  - Added the required column `script` to the `Journal` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Journal" ADD COLUMN     "script" TEXT NOT NULL;
