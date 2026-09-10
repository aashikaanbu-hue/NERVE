-- CreateEnum
CREATE TYPE "CorridorStatus" AS ENUM ('ACCESSIBLE', 'CAUTION', 'RESTRICTED', 'CLOSED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "CommunityAccessStatus" AS ENUM ('CONNECTED', 'AT_RISK', 'PARTIALLY_ISOLATED', 'ISOLATED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "FacilityType" AS ENUM ('HEALTH_CENTRE', 'HOSPITAL', 'PHARMACY', 'SCHOOL', 'RELIEF_CENTRE', 'WAREHOUSE', 'FUEL_STATION', 'POLICE_STATION', 'FIRE_STATION', 'OTHER');

-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('LANDSLIDE', 'FLOOD', 'ROAD_DAMAGE', 'BRIDGE_DAMAGE', 'TREE_FALL', 'ACCIDENT', 'WEATHER_HAZARD', 'VISIBILITY_HAZARD', 'OTHER');

-- CreateEnum
CREATE TYPE "IncidentSource" AS ENUM ('FIELD_REPORT', 'WEATHER_API', 'SATELLITE', 'AGENT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'VERIFIED', 'MONITORING', 'MITIGATING', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DeliveryPriority" AS ENUM ('NORMAL', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PLANNED', 'APPROVAL_PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELAYED', 'REROUTED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RoutePlanType" AS ENUM ('PLANNED', 'ALTERNATIVE', 'ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AgentType" AS ENUM ('SENSE', 'IMPACT', 'ROUTE', 'COMMAND');

-- CreateEnum
CREATE TYPE "AgentRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'AWAITING_APPROVAL', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ToolCallStatus" AS ENUM ('STARTED', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "RecommendationType" AS ENUM ('ROAD_RESTRICTION', 'ROUTE_CHANGE', 'PREPOSITION_SUPPLIES', 'COMMUNITY_ALERT', 'DISPATCH_SUPPORT', 'DELIVERY_HOLD', 'FIELD_VERIFICATION', 'OTHER');

-- CreateEnum
CREATE TYPE "RecommendationPriority" AS ENUM ('INFORMATIONAL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('PROPOSED', 'AWAITING_APPROVAL', 'APPROVED', 'REJECTED', 'EXECUTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApprovalDecisionType" AS ENUM ('APPROVED', 'REJECTED', 'CHANGES_REQUESTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'INCIDENT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'INCIDENT_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'FIELD_REPORT_SUBMITTED';
ALTER TYPE "AuditAction" ADD VALUE 'DELIVERY_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'DELIVERY_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'AGENT_RUN_STARTED';
ALTER TYPE "AuditAction" ADD VALUE 'RECOMMENDATION_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'RECOMMENDATION_APPROVED';
ALTER TYPE "AuditAction" ADD VALUE 'RECOMMENDATION_REJECTED';

-- CreateTable
CREATE TABLE "road_corridors" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'Meghalaya',
    "startLocation" TEXT NOT NULL,
    "endLocation" TEXT NOT NULL,
    "totalDistanceKm" DECIMAL(8,2) NOT NULL,
    "status" "CorridorStatus" NOT NULL DEFAULT 'UNKNOWN',
    "riskScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastAssessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "road_corridors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "road_segments" (
    "id" UUID NOT NULL,
    "corridorId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startPoint" TEXT NOT NULL,
    "endPoint" TEXT NOT NULL,
    "startLatitude" DECIMAL(9,6) NOT NULL,
    "startLongitude" DECIMAL(9,6) NOT NULL,
    "endLatitude" DECIMAL(9,6) NOT NULL,
    "endLongitude" DECIMAL(9,6) NOT NULL,
    "surfaceType" TEXT,
    "status" "CorridorStatus" NOT NULL DEFAULT 'UNKNOWN',
    "riskScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastInspectionAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "road_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communities" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'Meghalaya',
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "population" INTEGER,
    "vulnerabilityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "accessStatus" "CommunityAccessStatus" NOT NULL DEFAULT 'UNKNOWN',
    "lastAssessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corridor_communities" (
    "corridorId" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "accessPriority" INTEGER NOT NULL DEFAULT 1,
    "distanceKm" DECIMAL(8,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "corridor_communities_pkey" PRIMARY KEY ("corridorId","communityId")
);

-- CreateTable
CREATE TABLE "critical_facilities" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "communityId" UUID NOT NULL,
    "corridorId" UUID,
    "name" TEXT NOT NULL,
    "type" "FacilityType" NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "contactPhone" TEXT,
    "capacity" INTEGER,
    "operational" BOOLEAN NOT NULL DEFAULT true,
    "accessStatus" "CommunityAccessStatus" NOT NULL DEFAULT 'UNKNOWN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "critical_facilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" UUID NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "corridorId" UUID,
    "roadSegmentId" UUID,
    "reportedById" UUID,
    "type" "IncidentType" NOT NULL,
    "source" "IncidentSource" NOT NULL,
    "severity" "Severity" NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "riskScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_community_impacts" (
    "incidentId" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "impactLevel" "Severity" NOT NULL,
    "estimatedIsolationHours" INTEGER,
    "estimatedPopulationAffected" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incident_community_impacts_pkey" PRIMARY KEY ("incidentId","communityId")
);

-- CreateTable
CREATE TABLE "field_reports" (
    "id" UUID NOT NULL,
    "reportedById" UUID NOT NULL,
    "corridorId" UUID,
    "roadSegmentId" UUID,
    "incidentId" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "mediaUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "field_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deliveries" (
    "id" UUID NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "createdById" UUID NOT NULL,
    "assignedDriverId" UUID,
    "corridorId" UUID,
    "destinationCommunityId" UUID NOT NULL,
    "destinationFacilityId" UUID,
    "cargoType" TEXT NOT NULL,
    "cargoDescription" TEXT,
    "quantity" DECIMAL(10,2),
    "unit" TEXT,
    "priority" "DeliveryPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PLANNED',
    "originName" TEXT NOT NULL,
    "originLatitude" DECIMAL(9,6),
    "originLongitude" DECIMAL(9,6),
    "currentLatitude" DECIMAL(9,6),
    "currentLongitude" DECIMAL(9,6),
    "plannedDepartureAt" TIMESTAMP(3),
    "estimatedArrivalAt" TIMESTAMP(3),
    "actualDepartureAt" TIMESTAMP(3),
    "actualArrivalAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_plans" (
    "id" UUID NOT NULL,
    "deliveryId" UUID NOT NULL,
    "corridorId" UUID,
    "agentRunId" UUID,
    "name" TEXT NOT NULL,
    "type" "RoutePlanType" NOT NULL DEFAULT 'PLANNED',
    "distanceKm" DECIMAL(8,2) NOT NULL,
    "estimatedMinutes" INTEGER NOT NULL,
    "riskScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "geometry" JSONB,
    "instructions" JSONB,
    "isRecommended" BOOLEAN NOT NULL DEFAULT false,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "route_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_runs" (
    "id" UUID NOT NULL,
    "agentType" "AgentType" NOT NULL,
    "status" "AgentRunStatus" NOT NULL DEFAULT 'QUEUED',
    "trigger" TEXT NOT NULL,
    "inputSnapshot" JSONB NOT NULL,
    "outputSnapshot" JSONB,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_tool_calls" (
    "id" UUID NOT NULL,
    "agentRunId" UUID NOT NULL,
    "toolName" TEXT NOT NULL,
    "status" "ToolCallStatus" NOT NULL DEFAULT 'STARTED',
    "request" JSONB NOT NULL,
    "response" JSONB,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_tool_calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_recommendations" (
    "id" UUID NOT NULL,
    "agentRunId" UUID,
    "corridorId" UUID,
    "roadSegmentId" UUID,
    "incidentId" UUID,
    "deliveryId" UUID,
    "reviewedById" UUID,
    "agentType" "AgentType" NOT NULL,
    "type" "RecommendationType" NOT NULL,
    "priority" "RecommendationPriority" NOT NULL,
    "status" "RecommendationStatus" NOT NULL DEFAULT 'PROPOSED',
    "title" TEXT NOT NULL,
    "reasoning" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "evidence" JSONB,
    "proposedAction" JSONB,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "reviewedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_decisions" (
    "id" UUID NOT NULL,
    "recommendationId" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "decision" "ApprovalDecisionType" NOT NULL,
    "comment" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "road_corridors_code_key" ON "road_corridors"("code");

-- CreateIndex
CREATE INDEX "road_corridors_district_idx" ON "road_corridors"("district");

-- CreateIndex
CREATE INDEX "road_corridors_status_idx" ON "road_corridors"("status");

-- CreateIndex
CREATE INDEX "road_corridors_riskScore_idx" ON "road_corridors"("riskScore");

-- CreateIndex
CREATE INDEX "road_segments_corridorId_idx" ON "road_segments"("corridorId");

-- CreateIndex
CREATE INDEX "road_segments_status_idx" ON "road_segments"("status");

-- CreateIndex
CREATE INDEX "road_segments_riskScore_idx" ON "road_segments"("riskScore");

-- CreateIndex
CREATE UNIQUE INDEX "road_segments_corridorId_code_key" ON "road_segments"("corridorId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "communities_code_key" ON "communities"("code");

-- CreateIndex
CREATE INDEX "communities_district_idx" ON "communities"("district");

-- CreateIndex
CREATE INDEX "communities_accessStatus_idx" ON "communities"("accessStatus");

-- CreateIndex
CREATE INDEX "communities_vulnerabilityScore_idx" ON "communities"("vulnerabilityScore");

-- CreateIndex
CREATE INDEX "corridor_communities_communityId_idx" ON "corridor_communities"("communityId");

-- CreateIndex
CREATE INDEX "corridor_communities_isPrimary_idx" ON "corridor_communities"("isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "critical_facilities_code_key" ON "critical_facilities"("code");

-- CreateIndex
CREATE INDEX "critical_facilities_communityId_idx" ON "critical_facilities"("communityId");

-- CreateIndex
CREATE INDEX "critical_facilities_corridorId_idx" ON "critical_facilities"("corridorId");

-- CreateIndex
CREATE INDEX "critical_facilities_type_idx" ON "critical_facilities"("type");

-- CreateIndex
CREATE INDEX "critical_facilities_operational_idx" ON "critical_facilities"("operational");

-- CreateIndex
CREATE UNIQUE INDEX "incidents_referenceNumber_key" ON "incidents"("referenceNumber");

-- CreateIndex
CREATE INDEX "incidents_corridorId_idx" ON "incidents"("corridorId");

-- CreateIndex
CREATE INDEX "incidents_roadSegmentId_idx" ON "incidents"("roadSegmentId");

-- CreateIndex
CREATE INDEX "incidents_reportedById_idx" ON "incidents"("reportedById");

-- CreateIndex
CREATE INDEX "incidents_type_idx" ON "incidents"("type");

-- CreateIndex
CREATE INDEX "incidents_severity_idx" ON "incidents"("severity");

-- CreateIndex
CREATE INDEX "incidents_status_idx" ON "incidents"("status");

-- CreateIndex
CREATE INDEX "incidents_detectedAt_idx" ON "incidents"("detectedAt");

-- CreateIndex
CREATE INDEX "incident_community_impacts_communityId_idx" ON "incident_community_impacts"("communityId");

-- CreateIndex
CREATE INDEX "incident_community_impacts_impactLevel_idx" ON "incident_community_impacts"("impactLevel");

-- CreateIndex
CREATE INDEX "field_reports_reportedById_idx" ON "field_reports"("reportedById");

-- CreateIndex
CREATE INDEX "field_reports_corridorId_idx" ON "field_reports"("corridorId");

-- CreateIndex
CREATE INDEX "field_reports_roadSegmentId_idx" ON "field_reports"("roadSegmentId");

-- CreateIndex
CREATE INDEX "field_reports_incidentId_idx" ON "field_reports"("incidentId");

-- CreateIndex
CREATE INDEX "field_reports_verificationStatus_idx" ON "field_reports"("verificationStatus");

-- CreateIndex
CREATE INDEX "field_reports_capturedAt_idx" ON "field_reports"("capturedAt");

-- CreateIndex
CREATE UNIQUE INDEX "deliveries_referenceNumber_key" ON "deliveries"("referenceNumber");

-- CreateIndex
CREATE INDEX "deliveries_createdById_idx" ON "deliveries"("createdById");

-- CreateIndex
CREATE INDEX "deliveries_assignedDriverId_idx" ON "deliveries"("assignedDriverId");

-- CreateIndex
CREATE INDEX "deliveries_corridorId_idx" ON "deliveries"("corridorId");

-- CreateIndex
CREATE INDEX "deliveries_destinationCommunityId_idx" ON "deliveries"("destinationCommunityId");

-- CreateIndex
CREATE INDEX "deliveries_destinationFacilityId_idx" ON "deliveries"("destinationFacilityId");

-- CreateIndex
CREATE INDEX "deliveries_priority_idx" ON "deliveries"("priority");

-- CreateIndex
CREATE INDEX "deliveries_status_idx" ON "deliveries"("status");

-- CreateIndex
CREATE INDEX "deliveries_plannedDepartureAt_idx" ON "deliveries"("plannedDepartureAt");

-- CreateIndex
CREATE INDEX "route_plans_deliveryId_idx" ON "route_plans"("deliveryId");

-- CreateIndex
CREATE INDEX "route_plans_corridorId_idx" ON "route_plans"("corridorId");

-- CreateIndex
CREATE INDEX "route_plans_agentRunId_idx" ON "route_plans"("agentRunId");

-- CreateIndex
CREATE INDEX "route_plans_type_idx" ON "route_plans"("type");

-- CreateIndex
CREATE INDEX "route_plans_isRecommended_idx" ON "route_plans"("isRecommended");

-- CreateIndex
CREATE INDEX "route_plans_isApproved_idx" ON "route_plans"("isApproved");

-- CreateIndex
CREATE INDEX "agent_runs_agentType_idx" ON "agent_runs"("agentType");

-- CreateIndex
CREATE INDEX "agent_runs_status_idx" ON "agent_runs"("status");

-- CreateIndex
CREATE INDEX "agent_runs_createdAt_idx" ON "agent_runs"("createdAt");

-- CreateIndex
CREATE INDEX "agent_tool_calls_agentRunId_idx" ON "agent_tool_calls"("agentRunId");

-- CreateIndex
CREATE INDEX "agent_tool_calls_toolName_idx" ON "agent_tool_calls"("toolName");

-- CreateIndex
CREATE INDEX "agent_tool_calls_status_idx" ON "agent_tool_calls"("status");

-- CreateIndex
CREATE INDEX "agent_tool_calls_startedAt_idx" ON "agent_tool_calls"("startedAt");

-- CreateIndex
CREATE INDEX "agent_recommendations_agentRunId_idx" ON "agent_recommendations"("agentRunId");

-- CreateIndex
CREATE INDEX "agent_recommendations_corridorId_idx" ON "agent_recommendations"("corridorId");

-- CreateIndex
CREATE INDEX "agent_recommendations_roadSegmentId_idx" ON "agent_recommendations"("roadSegmentId");

-- CreateIndex
CREATE INDEX "agent_recommendations_incidentId_idx" ON "agent_recommendations"("incidentId");

-- CreateIndex
CREATE INDEX "agent_recommendations_deliveryId_idx" ON "agent_recommendations"("deliveryId");

-- CreateIndex
CREATE INDEX "agent_recommendations_reviewedById_idx" ON "agent_recommendations"("reviewedById");

-- CreateIndex
CREATE INDEX "agent_recommendations_agentType_idx" ON "agent_recommendations"("agentType");

-- CreateIndex
CREATE INDEX "agent_recommendations_priority_idx" ON "agent_recommendations"("priority");

-- CreateIndex
CREATE INDEX "agent_recommendations_status_idx" ON "agent_recommendations"("status");

-- CreateIndex
CREATE INDEX "agent_recommendations_createdAt_idx" ON "agent_recommendations"("createdAt");

-- CreateIndex
CREATE INDEX "approval_decisions_recommendationId_idx" ON "approval_decisions"("recommendationId");

-- CreateIndex
CREATE INDEX "approval_decisions_actorId_idx" ON "approval_decisions"("actorId");

-- CreateIndex
CREATE INDEX "approval_decisions_decision_idx" ON "approval_decisions"("decision");

-- CreateIndex
CREATE INDEX "approval_decisions_decidedAt_idx" ON "approval_decisions"("decidedAt");

-- AddForeignKey
ALTER TABLE "road_segments" ADD CONSTRAINT "road_segments_corridorId_fkey" FOREIGN KEY ("corridorId") REFERENCES "road_corridors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corridor_communities" ADD CONSTRAINT "corridor_communities_corridorId_fkey" FOREIGN KEY ("corridorId") REFERENCES "road_corridors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corridor_communities" ADD CONSTRAINT "corridor_communities_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "critical_facilities" ADD CONSTRAINT "critical_facilities_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "critical_facilities" ADD CONSTRAINT "critical_facilities_corridorId_fkey" FOREIGN KEY ("corridorId") REFERENCES "road_corridors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_corridorId_fkey" FOREIGN KEY ("corridorId") REFERENCES "road_corridors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_roadSegmentId_fkey" FOREIGN KEY ("roadSegmentId") REFERENCES "road_segments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_community_impacts" ADD CONSTRAINT "incident_community_impacts_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_community_impacts" ADD CONSTRAINT "incident_community_impacts_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_reports" ADD CONSTRAINT "field_reports_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_reports" ADD CONSTRAINT "field_reports_corridorId_fkey" FOREIGN KEY ("corridorId") REFERENCES "road_corridors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_reports" ADD CONSTRAINT "field_reports_roadSegmentId_fkey" FOREIGN KEY ("roadSegmentId") REFERENCES "road_segments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_reports" ADD CONSTRAINT "field_reports_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_assignedDriverId_fkey" FOREIGN KEY ("assignedDriverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_corridorId_fkey" FOREIGN KEY ("corridorId") REFERENCES "road_corridors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_destinationCommunityId_fkey" FOREIGN KEY ("destinationCommunityId") REFERENCES "communities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_destinationFacilityId_fkey" FOREIGN KEY ("destinationFacilityId") REFERENCES "critical_facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_plans" ADD CONSTRAINT "route_plans_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_plans" ADD CONSTRAINT "route_plans_corridorId_fkey" FOREIGN KEY ("corridorId") REFERENCES "road_corridors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_plans" ADD CONSTRAINT "route_plans_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "agent_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_tool_calls" ADD CONSTRAINT "agent_tool_calls_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "agent_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_recommendations" ADD CONSTRAINT "agent_recommendations_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "agent_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_recommendations" ADD CONSTRAINT "agent_recommendations_corridorId_fkey" FOREIGN KEY ("corridorId") REFERENCES "road_corridors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_recommendations" ADD CONSTRAINT "agent_recommendations_roadSegmentId_fkey" FOREIGN KEY ("roadSegmentId") REFERENCES "road_segments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_recommendations" ADD CONSTRAINT "agent_recommendations_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_recommendations" ADD CONSTRAINT "agent_recommendations_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "deliveries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_recommendations" ADD CONSTRAINT "agent_recommendations_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_decisions" ADD CONSTRAINT "approval_decisions_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "agent_recommendations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_decisions" ADD CONSTRAINT "approval_decisions_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
