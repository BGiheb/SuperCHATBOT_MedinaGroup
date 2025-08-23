-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'SUB_ADMIN';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createdById" INTEGER;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
