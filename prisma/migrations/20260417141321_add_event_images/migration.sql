-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "coverImagePublicId" TEXT,
ADD COLUMN     "coverImageUrl" TEXT,
ADD COLUMN     "galleryImages" TEXT[];

-- AlterTable
ALTER TABLE "EventRegistration" ADD COLUMN     "proofImagePublicId" TEXT,
ADD COLUMN     "proofImageUrl" TEXT;
