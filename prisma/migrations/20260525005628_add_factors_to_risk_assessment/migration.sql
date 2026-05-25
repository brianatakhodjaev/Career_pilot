/*
  Warnings:

  - Added the required column `factors` to the `RiskAssessment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RiskAssessment" ADD COLUMN     "factors" JSONB NOT NULL;
