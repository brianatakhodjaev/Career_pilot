-- CreateTable
CREATE TABLE "LessonItemProgress" (
    "id" TEXT NOT NULL,
    "plateItemId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "LessonItemProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReflectionAnswer" (
    "id" TEXT NOT NULL,
    "plateItemId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReflectionAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceState" (
    "id" TEXT NOT NULL,
    "plateItemId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "selectedTaskId" TEXT,
    "promptHistory" JSONB NOT NULL,
    "currentPrompt" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "byoApiProvider" TEXT,
    "byoApiKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LessonItemProgress_plateItemId_itemId_key" ON "LessonItemProgress"("plateItemId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceState_plateItemId_itemId_key" ON "WorkspaceState"("plateItemId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

-- AddForeignKey
ALTER TABLE "LessonItemProgress" ADD CONSTRAINT "LessonItemProgress_plateItemId_fkey" FOREIGN KEY ("plateItemId") REFERENCES "PlateItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReflectionAnswer" ADD CONSTRAINT "ReflectionAnswer_plateItemId_fkey" FOREIGN KEY ("plateItemId") REFERENCES "PlateItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceState" ADD CONSTRAINT "WorkspaceState_plateItemId_fkey" FOREIGN KEY ("plateItemId") REFERENCES "PlateItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
