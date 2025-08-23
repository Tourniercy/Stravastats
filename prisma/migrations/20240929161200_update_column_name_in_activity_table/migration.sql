/*
  Warnings:

  - You are about to drop the column `fivekm` on the `Activity` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Activity" DROP COLUMN "fivekm",
ADD COLUMN     "fiveKm" TEXT;
