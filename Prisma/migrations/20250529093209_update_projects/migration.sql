/*
  Warnings:

  - You are about to drop the column `projectId` on the `Model` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Model" DROP CONSTRAINT "Model_projectId_fkey";

-- AlterTable
ALTER TABLE "Model" DROP COLUMN "projectId";

-- CreateTable
CREATE TABLE "_ModelProjects" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ModelProjects_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ModelProjects_B_index" ON "_ModelProjects"("B");

-- AddForeignKey
ALTER TABLE "_ModelProjects" ADD CONSTRAINT "_ModelProjects_A_fkey" FOREIGN KEY ("A") REFERENCES "Model"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ModelProjects" ADD CONSTRAINT "_ModelProjects_B_fkey" FOREIGN KEY ("B") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
