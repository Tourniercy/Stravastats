/*
  Warnings:

  - You are about to drop the column `detailedActivity` on the `Activity` table. All the data in the column will be lost.
  - The `halfMarathon` column on the `Activity` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `marathon` column on the `Activity` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `oneKm` column on the `Activity` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `tenKm` column on the `Activity` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `fiveKm` column on the `Activity` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Activity" DROP COLUMN "detailedActivity",
DROP COLUMN "halfMarathon",
ADD COLUMN     "halfMarathon" INTEGER,
DROP COLUMN "marathon",
ADD COLUMN     "marathon" INTEGER,
DROP COLUMN "oneKm",
ADD COLUMN     "oneKm" INTEGER,
DROP COLUMN "tenKm",
ADD COLUMN     "tenKm" INTEGER,
DROP COLUMN "fiveKm",
ADD COLUMN     "fiveKm" INTEGER;
