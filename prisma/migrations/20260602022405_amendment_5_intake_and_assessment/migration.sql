/*
  Warnings:

  - You are about to drop the column `defensibleTasks` on the `RiskAssessment` table. All the data in the column will be lost.
  - You are about to drop the column `exposedTasks` on the `RiskAssessment` table. All the data in the column will be lost.
  - Added the required column `exposedWork` to the `RiskAssessment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `inputDepth` to the `RiskAssessment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `inputDepthNote` to the `RiskAssessment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RiskAssessment" DROP COLUMN "defensibleTasks",
DROP COLUMN "exposedTasks",
ADD COLUMN     "defensibleWork" TEXT[],
ADD COLUMN     "exposedWork" JSONB NOT NULL,
ADD COLUMN     "inputDepth" TEXT NOT NULL,
ADD COLUMN     "inputDepthNote" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "proudPoint" TEXT,
ADD COLUMN     "reviewCorrection" TEXT,
ADD COLUMN     "reviewSummary" TEXT;
