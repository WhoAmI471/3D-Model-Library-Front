-- AlterTable
ALTER TABLE "User" ADD COLUMN     "sphereId" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_sphereId_fkey" FOREIGN KEY ("sphereId") REFERENCES "Sphere"("id") ON DELETE SET NULL ON UPDATE CASCADE;
