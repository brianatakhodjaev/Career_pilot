/*
  Warnings:

  - You are about to drop the column `description` on the `CareerPlan` table. All the data in the column will be lost.
  - You are about to drop the column `matchScore` on the `CareerPlan` table. All the data in the column will be lost.
  - You are about to drop the column `planData` on the `CareerPlan` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `CareerPlan` table. All the data in the column will be lost.
  - You are about to drop the column `trackType` on the `CareerPlan` table. All the data in the column will be lost.
  - You are about to drop the `LearningTask` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PlanPhase` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "LearningTask" DROP CONSTRAINT "LearningTask_phaseId_fkey";

-- DropForeignKey
ALTER TABLE "PlanPhase" DROP CONSTRAINT "PlanPhase_planId_fkey";

-- AlterTable
ALTER TABLE "CareerPlan" DROP COLUMN "description",
DROP COLUMN "matchScore",
DROP COLUMN "planData",
DROP COLUMN "title",
DROP COLUMN "trackType";

-- DropTable
DROP TABLE "LearningTask";

-- DropTable
DROP TABLE "PlanPhase";

-- CreateTable
CREATE TABLE "BuffetUnit" (
    "id" TEXT NOT NULL,
    "unitNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "timeRangeMin" INTEGER NOT NULL,
    "timeRangeMax" INTEGER NOT NULL,
    "exerciseFormat" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "prerequisites" INTEGER[],
    "version" INTEGER NOT NULL DEFAULT 1,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuffetUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlateItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PlateItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BuffetUnit_unitNumber_key" ON "BuffetUnit"("unitNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PlateItem_planId_unitId_key" ON "PlateItem"("planId", "unitId");

-- AddForeignKey
ALTER TABLE "PlateItem" ADD CONSTRAINT "PlateItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "CareerPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlateItem" ADD CONSTRAINT "PlateItem_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "BuffetUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
