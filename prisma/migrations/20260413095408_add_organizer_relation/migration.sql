-- CreateEnum
CREATE TYPE "OrgRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "OrganizerRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationName" TEXT NOT NULL,
    "description" TEXT,
    "status" "OrgRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizerRequest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OrganizerRequest" ADD CONSTRAINT "OrganizerRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
