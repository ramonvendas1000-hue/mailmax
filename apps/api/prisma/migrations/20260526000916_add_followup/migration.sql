-- CreateTable
CREATE TABLE "FollowupSequence" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fromName" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "waitHours" INTEGER NOT NULL DEFAULT 24,
    "maxSteps" INTEGER NOT NULL DEFAULT 3,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowupSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowupStep" (
    "id" TEXT NOT NULL,
    "sequenceId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "delayHours" INTEGER NOT NULL DEFAULT 24,

    CONSTRAINT "FollowupStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowupEnrollment" (
    "id" TEXT NOT NULL,
    "sequenceId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastSentAt" TIMESTAMP(3),
    "nextSendAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowupEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FollowupSequence_organizationId_idx" ON "FollowupSequence"("organizationId");

-- CreateIndex
CREATE INDEX "FollowupStep_sequenceId_idx" ON "FollowupStep"("sequenceId");

-- CreateIndex
CREATE UNIQUE INDEX "FollowupStep_sequenceId_stepNumber_key" ON "FollowupStep"("sequenceId", "stepNumber");

-- CreateIndex
CREATE INDEX "FollowupEnrollment_status_nextSendAt_idx" ON "FollowupEnrollment"("status", "nextSendAt");

-- CreateIndex
CREATE INDEX "FollowupEnrollment_organizationId_idx" ON "FollowupEnrollment"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "FollowupEnrollment_sequenceId_contactId_key" ON "FollowupEnrollment"("sequenceId", "contactId");

-- AddForeignKey
ALTER TABLE "FollowupSequence" ADD CONSTRAINT "FollowupSequence_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowupStep" ADD CONSTRAINT "FollowupStep_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "FollowupSequence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowupEnrollment" ADD CONSTRAINT "FollowupEnrollment_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "FollowupSequence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowupEnrollment" ADD CONSTRAINT "FollowupEnrollment_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
