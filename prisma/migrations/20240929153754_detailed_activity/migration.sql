-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "detailedActivity" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fivekm" TEXT,
ADD COLUMN     "halfMarathon" TEXT,
ADD COLUMN     "marathon" TEXT,
ADD COLUMN     "oneKm" TEXT,
ADD COLUMN     "tenKm" TEXT;
