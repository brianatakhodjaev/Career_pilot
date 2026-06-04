-- CreateTable
CREATE TABLE "WorkspaceRunLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plateItemId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceRunLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkspaceRunLog_userId_createdAt_idx" ON "WorkspaceRunLog"("userId", "createdAt");
