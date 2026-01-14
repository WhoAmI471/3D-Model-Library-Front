-- CreateTable
CREATE TABLE "DeletedModel" (
    "id" TEXT NOT NULL,
    "originalModelId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "authorId" TEXT,
    "authorName" TEXT,
    "sphereId" TEXT,
    "sphereName" TEXT,
    "deletedById" TEXT,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletionComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectNames" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "DeletedModel_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DeletedModel" ADD CONSTRAINT "DeletedModel_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
