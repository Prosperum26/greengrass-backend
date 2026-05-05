-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "checkinRadius" DOUBLE PRECISION NOT NULL DEFAULT 50.0;

-- AlterTable
ALTER TABLE "EventRegistration" ADD COLUMN     "checkinLatitude" DOUBLE PRECISION,
ADD COLUMN     "checkinLongitude" DOUBLE PRECISION;
