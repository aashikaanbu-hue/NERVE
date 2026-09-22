-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('APPROVAL_DECISION', 'RISK_ALERT', 'ROUTE_UPDATE', 'DELIVERY_UPDATE', 'COMMUNITY_IMPACT', 'SYSTEM_UPDATE');

-- CreateEnum
CREATE TYPE "NotificationSeverity" AS ENUM ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('UNREAD', 'READ', 'ACKNOWLEDGED', 'DISMISSED');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'NOTIFICATION_READ';
ALTER TYPE "AuditAction" ADD VALUE 'NOTIFICATION_ACKNOWLEDGED';
ALTER TYPE "AuditAction" ADD VALUE 'NOTIFICATION_DISMISSED';

-- CreateTable
CREATE TABLE "operational_notifications" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "sourceRecommendationId" UUID,
    "type" "NotificationType" NOT NULL,
    "severity" "NotificationSeverity" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'UNREAD',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actionUrl" TEXT,
    "metadata" JSONB,
    "deliveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operational_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "operational_notifications_userId_sourceRecommendationId_type_key"
ON "operational_notifications"("userId", "sourceRecommendationId", "type");

-- CreateIndex
CREATE INDEX "operational_notifications_userId_idx"
ON "operational_notifications"("userId");

-- CreateIndex
CREATE INDEX "operational_notifications_sourceRecommendationId_idx"
ON "operational_notifications"("sourceRecommendationId");

-- CreateIndex
CREATE INDEX "operational_notifications_status_idx"
ON "operational_notifications"("status");

-- CreateIndex
CREATE INDEX "operational_notifications_severity_idx"
ON "operational_notifications"("severity");

-- CreateIndex
CREATE INDEX "operational_notifications_deliveredAt_idx"
ON "operational_notifications"("deliveredAt");

-- AddForeignKey
ALTER TABLE "operational_notifications"
ADD CONSTRAINT "operational_notifications_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operational_notifications"
ADD CONSTRAINT "operational_notifications_sourceRecommendationId_fkey"
FOREIGN KEY ("sourceRecommendationId")
REFERENCES "agent_recommendations"("id")
ON DELETE SET NULL ON UPDATE CASCADE;