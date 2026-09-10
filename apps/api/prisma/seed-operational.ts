import {
  AgentRunStatus,
  AgentType,
  ApprovalDecisionType,
  CommunityAccessStatus,
  CorridorStatus,
  DeliveryPriority,
  DeliveryStatus,
  FacilityType,
  IncidentSource,
  IncidentStatus,
  IncidentType,
  PrismaClient,
  RecommendationPriority,
  RecommendationStatus,
  RecommendationType,
  RoutePlanType,
  Severity,
  ToolCallStatus,
  VerificationStatus,
} from "@prisma/client";

const prisma =
  new PrismaClient();

const ids = {
  corridor:
    "10000000-0000-4000-8000-000000000001",

  segmentShillongMawkdok:
    "20000000-0000-4000-8000-000000000001",

  segmentMawkdokSohra:
    "20000000-0000-4000-8000-000000000002",

  communityMawmluh:
    "30000000-0000-4000-8000-000000000001",

  communityLaitkynsew:
    "30000000-0000-4000-8000-000000000002",

  communityMawsmai:
    "30000000-0000-4000-8000-000000000003",

  facilityMawmluh:
    "40000000-0000-4000-8000-000000000001",

  incident:
    "50000000-0000-4000-8000-000000000001",

  fieldReport:
    "60000000-0000-4000-8000-000000000001",

  delivery:
    "70000000-0000-4000-8000-000000000001",

  primaryRoute:
    "80000000-0000-4000-8000-000000000001",

  saferRoute:
    "80000000-0000-4000-8000-000000000002",

  senseRun:
    "90000000-0000-4000-8000-000000000001",

  impactRun:
    "90000000-0000-4000-8000-000000000002",

  routeRun:
    "90000000-0000-4000-8000-000000000003",

  commandRun:
    "90000000-0000-4000-8000-000000000004",

  weatherTool:
    "a0000000-0000-4000-8000-000000000001",

  corridorTool:
    "a0000000-0000-4000-8000-000000000002",

  impactTool:
    "a0000000-0000-4000-8000-000000000003",

  routeTool:
    "a0000000-0000-4000-8000-000000000004",

  approvalTool:
    "a0000000-0000-4000-8000-000000000005",

  restrictionRecommendation:
    "b0000000-0000-4000-8000-000000000001",

  routeRecommendation:
    "b0000000-0000-4000-8000-000000000002",

  supplyRecommendation:
    "b0000000-0000-4000-8000-000000000003",

  approval:
    "c0000000-0000-4000-8000-000000000001",
};

async function seedOperationalData():
  Promise<void> {
  const [
    authority,
    logisticsOperator,
    fieldOfficial,
    driver,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: {
        email:
          "authority@nerve.gov.in",
      },
    }),

    prisma.user.findUnique({
      where: {
        email:
          "logistics@nerve.in",
      },
    }),

    prisma.user.findUnique({
      where: {
        email:
          "field@nerve.gov.in",
      },
    }),

    prisma.user.findUnique({
      where: {
        email:
          "driver@nerve.in",
      },
    }),
  ]);

  if (
    !authority ||
    !logisticsOperator ||
    !fieldOfficial ||
    !driver
  ) {
    throw new Error(
      "Demo users are missing. Run prisma/seed.ts before running the operational seed.",
    );
  }

  const assessedAt =
    new Date(
      "2026-09-03T08:30:00.000Z",
    );

  const corridor =
    await prisma.roadCorridor.upsert({
      where: {
        id: ids.corridor,
      },

      update: {
        code: "EKH-SHS-01",

        name:
          "Shillong–Sohra Essential Access Corridor",

        district:
          "East Khasi Hills",

        state:
          "Meghalaya",

        startLocation:
          "Shillong",

        endLocation:
          "Sohra",

        totalDistanceKm: 54,

        status:
          CorridorStatus.CAUTION,

        riskScore: 68.5,

        lastAssessedAt:
          assessedAt,
      },

      create: {
        id: ids.corridor,

        code: "EKH-SHS-01",

        name:
          "Shillong–Sohra Essential Access Corridor",

        district:
          "East Khasi Hills",

        state:
          "Meghalaya",

        startLocation:
          "Shillong",

        endLocation:
          "Sohra",

        totalDistanceKm: 54,

        status:
          CorridorStatus.CAUTION,

        riskScore: 68.5,

        lastAssessedAt:
          assessedAt,
      },
    });

  const segmentShillongMawkdok =
    await prisma.roadSegment.upsert({
      where: {
        id:
          ids.segmentShillongMawkdok,
      },

      update: {
        corridorId:
          corridor.id,

        code: "SHS-SEG-01",

        name:
          "Shillong to Mawkdok",

        startPoint:
          "Shillong",

        endPoint:
          "Mawkdok",

        startLatitude: 25.5788,
        startLongitude: 91.8933,
        endLatitude: 25.4432,
        endLongitude: 91.7492,

        surfaceType:
          "Paved mountain road",

        status:
          CorridorStatus.ACCESSIBLE,

        riskScore: 31.4,

        lastInspectionAt:
          assessedAt,
      },

      create: {
        id:
          ids.segmentShillongMawkdok,

        corridorId:
          corridor.id,

        code: "SHS-SEG-01",

        name:
          "Shillong to Mawkdok",

        startPoint:
          "Shillong",

        endPoint:
          "Mawkdok",

        startLatitude: 25.5788,
        startLongitude: 91.8933,
        endLatitude: 25.4432,
        endLongitude: 91.7492,

        surfaceType:
          "Paved mountain road",

        status:
          CorridorStatus.ACCESSIBLE,

        riskScore: 31.4,

        lastInspectionAt:
          assessedAt,
      },
    });

  const segmentMawkdokSohra =
    await prisma.roadSegment.upsert({
      where: {
        id:
          ids.segmentMawkdokSohra,
      },

      update: {
        corridorId:
          corridor.id,

        code: "SHS-SEG-02",

        name:
          "Mawkdok to Sohra",

        startPoint:
          "Mawkdok",

        endPoint:
          "Sohra",

        startLatitude: 25.4432,
        startLongitude: 91.7492,
        endLatitude: 25.2702,
        endLongitude: 91.7322,

        surfaceType:
          "Paved high-rainfall road",

        status:
          CorridorStatus.RESTRICTED,

        riskScore: 84,

        lastInspectionAt:
          assessedAt,
      },

      create: {
        id:
          ids.segmentMawkdokSohra,

        corridorId:
          corridor.id,

        code: "SHS-SEG-02",

        name:
          "Mawkdok to Sohra",

        startPoint:
          "Mawkdok",

        endPoint:
          "Sohra",

        startLatitude: 25.4432,
        startLongitude: 91.7492,
        endLatitude: 25.2702,
        endLongitude: 91.7322,

        surfaceType:
          "Paved high-rainfall road",

        status:
          CorridorStatus.RESTRICTED,

        riskScore: 84,

        lastInspectionAt:
          assessedAt,
      },
    });

  const mawmluh =
    await prisma.community.upsert({
      where: {
        id:
          ids.communityMawmluh,
      },

      update: {
        code: "COM-EKH-001",
        name: "Mawmluh",
        district:
          "East Khasi Hills",
        state: "Meghalaya",
        latitude: 25.2581,
        longitude: 91.7135,
        population: 7200,
        vulnerabilityScore: 74,
        accessStatus:
          CommunityAccessStatus.AT_RISK,
        lastAssessedAt:
          assessedAt,
      },

      create: {
        id:
          ids.communityMawmluh,

        code: "COM-EKH-001",
        name: "Mawmluh",
        district:
          "East Khasi Hills",
        state: "Meghalaya",
        latitude: 25.2581,
        longitude: 91.7135,
        population: 7200,
        vulnerabilityScore: 74,
        accessStatus:
          CommunityAccessStatus.AT_RISK,
        lastAssessedAt:
          assessedAt,
      },
    });

  const laitkynsew =
    await prisma.community.upsert({
      where: {
        id:
          ids.communityLaitkynsew,
      },

      update: {
        code: "COM-EKH-002",
        name: "Laitkynsew",
        district:
          "East Khasi Hills",
        state: "Meghalaya",
        latitude: 25.2722,
        longitude: 91.6791,
        population: 3600,
        vulnerabilityScore: 67,
        accessStatus:
          CommunityAccessStatus.AT_RISK,
        lastAssessedAt:
          assessedAt,
      },

      create: {
        id:
          ids.communityLaitkynsew,

        code: "COM-EKH-002",
        name: "Laitkynsew",
        district:
          "East Khasi Hills",
        state: "Meghalaya",
        latitude: 25.2722,
        longitude: 91.6791,
        population: 3600,
        vulnerabilityScore: 67,
        accessStatus:
          CommunityAccessStatus.AT_RISK,
        lastAssessedAt:
          assessedAt,
      },
    });

  const mawsmai =
    await prisma.community.upsert({
      where: {
        id:
          ids.communityMawsmai,
      },

      update: {
        code: "COM-EKH-003",
        name: "Mawsmai",
        district:
          "East Khasi Hills",
        state: "Meghalaya",
        latitude: 25.2445,
        longitude: 91.7242,
        population: 4800,
        vulnerabilityScore: 62,
        accessStatus:
          CommunityAccessStatus.AT_RISK,
        lastAssessedAt:
          assessedAt,
      },

      create: {
        id:
          ids.communityMawsmai,

        code: "COM-EKH-003",
        name: "Mawsmai",
        district:
          "East Khasi Hills",
        state: "Meghalaya",
        latitude: 25.2445,
        longitude: 91.7242,
        population: 4800,
        vulnerabilityScore: 62,
        accessStatus:
          CommunityAccessStatus.AT_RISK,
        lastAssessedAt:
          assessedAt,
      },
    });

  const communities = [
    {
      community:
        mawmluh,
      priority: 1,
      distance: 3.5,
    },
    {
      community:
        laitkynsew,
      priority: 2,
      distance: 6.8,
    },
    {
      community:
        mawsmai,
      priority: 2,
      distance: 4.2,
    },
  ];

  for (
    const item of communities
  ) {
    await prisma.corridorCommunity.upsert({
      where: {
        corridorId_communityId: {
          corridorId:
            corridor.id,

          communityId:
            item.community.id,
        },
      },

      update: {
        isPrimary: true,

        accessPriority:
          item.priority,

        distanceKm:
          item.distance,
      },

      create: {
        corridorId:
          corridor.id,

        communityId:
          item.community.id,

        isPrimary: true,

        accessPriority:
          item.priority,

        distanceKm:
          item.distance,
      },
    });
  }

  const facility =
    await prisma.criticalFacility.upsert({
      where: {
        id:
          ids.facilityMawmluh,
      },

      update: {
        code: "FAC-EKH-001",

        communityId:
          mawmluh.id,

        corridorId:
          corridor.id,

        name:
          "Mawmluh Primary Health Centre",

        type:
          FacilityType.HEALTH_CENTRE,

        latitude: 25.259,
        longitude: 91.7141,

        contactPhone:
          "+91-9876543210",

        capacity: 30,
        operational: true,

        accessStatus:
          CommunityAccessStatus.AT_RISK,
      },

      create: {
        id:
          ids.facilityMawmluh,

        code: "FAC-EKH-001",

        communityId:
          mawmluh.id,

        corridorId:
          corridor.id,

        name:
          "Mawmluh Primary Health Centre",

        type:
          FacilityType.HEALTH_CENTRE,

        latitude: 25.259,
        longitude: 91.7141,

        contactPhone:
          "+91-9876543210",

        capacity: 30,
        operational: true,

        accessStatus:
          CommunityAccessStatus.AT_RISK,
      },
    });

  const incident =
    await prisma.incident.upsert({
      where: {
        id: ids.incident,
      },

      update: {
        referenceNumber:
          "INC-EKH-2026-001",

        corridorId:
          corridor.id,

        roadSegmentId:
          segmentMawkdokSohra.id,

        reportedById:
          fieldOfficial.id,

        type:
          IncidentType.LANDSLIDE,

        source:
          IncidentSource.FIELD_REPORT,

        severity:
          Severity.CRITICAL,

        status:
          IncidentStatus.VERIFIED,

        title:
          "Elevated landslide risk near Sohra approach",

        description:
          "Heavy rainfall, saturated slope conditions and falling debris indicate a high probability of corridor disruption.",

        latitude: 25.2864,
        longitude: 91.7248,
        riskScore: 84,

        detectedAt:
          new Date(
            "2026-09-03T07:42:00.000Z",
          ),

        verifiedAt:
          new Date(
            "2026-09-03T08:05:00.000Z",
          ),
      },

      create: {
        id: ids.incident,

        referenceNumber:
          "INC-EKH-2026-001",

        corridorId:
          corridor.id,

        roadSegmentId:
          segmentMawkdokSohra.id,

        reportedById:
          fieldOfficial.id,

        type:
          IncidentType.LANDSLIDE,

        source:
          IncidentSource.FIELD_REPORT,

        severity:
          Severity.CRITICAL,

        status:
          IncidentStatus.VERIFIED,

        title:
          "Elevated landslide risk near Sohra approach",

        description:
          "Heavy rainfall, saturated slope conditions and falling debris indicate a high probability of corridor disruption.",

        latitude: 25.2864,
        longitude: 91.7248,
        riskScore: 84,

        detectedAt:
          new Date(
            "2026-09-03T07:42:00.000Z",
          ),

        verifiedAt:
          new Date(
            "2026-09-03T08:05:00.000Z",
          ),
      },
    });

  const impactData = [
    {
      community:
        mawmluh,

      level:
        Severity.CRITICAL,

      hours: 14,

      population: 7200,

      notes:
        "Primary health centre access may be interrupted.",
    },
    {
      community:
        laitkynsew,

      level:
        Severity.HIGH,

      hours: 9,

      population: 3600,

      notes:
        "Essential supply movement may require an alternate route.",
    },
    {
      community:
        mawsmai,

      level:
        Severity.HIGH,

      hours: 7,

      population: 4800,

      notes:
        "Tourist and local vehicle movement may be restricted.",
    },
  ];

  for (
    const impact of impactData
  ) {
    await prisma.incidentCommunityImpact.upsert({
      where: {
        incidentId_communityId: {
          incidentId:
            incident.id,

          communityId:
            impact.community.id,
        },
      },

      update: {
        impactLevel:
          impact.level,

        estimatedIsolationHours:
          impact.hours,

        estimatedPopulationAffected:
          impact.population,

        notes:
          impact.notes,
      },

      create: {
        incidentId:
          incident.id,

        communityId:
          impact.community.id,

        impactLevel:
          impact.level,

        estimatedIsolationHours:
          impact.hours,

        estimatedPopulationAffected:
          impact.population,

        notes:
          impact.notes,
      },
    });
  }

  await prisma.fieldReport.upsert({
    where: {
      id:
        ids.fieldReport,
    },

    update: {
      reportedById:
        fieldOfficial.id,

      corridorId:
        corridor.id,

      roadSegmentId:
        segmentMawkdokSohra.id,

      incidentId:
        incident.id,

      title:
        "Fresh debris and water flow observed",

      description:
        "Loose rock, roadside debris and continuous water flow were observed near the Sohra approach section.",

      latitude: 25.2864,
      longitude: 91.7248,

      mediaUrls: [
        "/demo/field-reports/sohra-road-risk-01.jpg",
      ],

      verificationStatus:
        VerificationStatus.VERIFIED,

      capturedAt:
        new Date(
          "2026-09-03T07:38:00.000Z",
        ),
    },

    create: {
      id:
        ids.fieldReport,

      reportedById:
        fieldOfficial.id,

      corridorId:
        corridor.id,

      roadSegmentId:
        segmentMawkdokSohra.id,

      incidentId:
        incident.id,

      title:
        "Fresh debris and water flow observed",

      description:
        "Loose rock, roadside debris and continuous water flow were observed near the Sohra approach section.",

      latitude: 25.2864,
      longitude: 91.7248,

      mediaUrls: [
        "/demo/field-reports/sohra-road-risk-01.jpg",
      ],

      verificationStatus:
        VerificationStatus.VERIFIED,

      capturedAt:
        new Date(
          "2026-09-03T07:38:00.000Z",
        ),
    },
  });

  const delivery =
    await prisma.delivery.upsert({
      where: {
        id: ids.delivery,
      },

      update: {
        referenceNumber:
          "DEL-EKH-2026-001",

        createdById:
          logisticsOperator.id,

        assignedDriverId:
          driver.id,

        corridorId:
          corridor.id,

        destinationCommunityId:
          mawmluh.id,

        destinationFacilityId:
          facility.id,

        cargoType:
          "Emergency medicines",

        cargoDescription:
          "Essential antibiotics, IV fluids and emergency medical supplies.",

        quantity: 24,
        unit: "cartons",

        priority:
          DeliveryPriority.CRITICAL,

        status:
          DeliveryStatus.REROUTED,

        originName:
          "Shillong Medical Warehouse",

        originLatitude: 25.5788,
        originLongitude: 91.8933,

        currentLatitude: 25.4671,
        currentLongitude: 91.781,

        plannedDepartureAt:
          new Date(
            "2026-09-03T08:00:00.000Z",
          ),

        estimatedArrivalAt:
          new Date(
            "2026-09-03T11:10:00.000Z",
          ),

        actualDepartureAt:
          new Date(
            "2026-09-03T08:12:00.000Z",
          ),
      },

      create: {
        id: ids.delivery,

        referenceNumber:
          "DEL-EKH-2026-001",

        createdById:
          logisticsOperator.id,

        assignedDriverId:
          driver.id,

        corridorId:
          corridor.id,

        destinationCommunityId:
          mawmluh.id,

        destinationFacilityId:
          facility.id,

        cargoType:
          "Emergency medicines",

        cargoDescription:
          "Essential antibiotics, IV fluids and emergency medical supplies.",

        quantity: 24,
        unit: "cartons",

        priority:
          DeliveryPriority.CRITICAL,

        status:
          DeliveryStatus.REROUTED,

        originName:
          "Shillong Medical Warehouse",

        originLatitude: 25.5788,
        originLongitude: 91.8933,

        currentLatitude: 25.4671,
        currentLongitude: 91.781,

        plannedDepartureAt:
          new Date(
            "2026-09-03T08:00:00.000Z",
          ),

        estimatedArrivalAt:
          new Date(
            "2026-09-03T11:10:00.000Z",
          ),

        actualDepartureAt:
          new Date(
            "2026-09-03T08:12:00.000Z",
          ),
      },
    });

  const senseRun =
    await prisma.agentRun.upsert({
      where: {
        id: ids.senseRun,
      },

      update: {
        agentType:
          AgentType.SENSE,

        status:
          AgentRunStatus.COMPLETED,

        trigger:
          "Scheduled regional risk assessment",

        inputSnapshot: {
          rainfallForecastMm: 42,
          soilSaturation: 0.81,
          fieldReports: 1,
          corridor:
            "EKH-SHS-01",
        },

        outputSnapshot: {
          riskScore: 84,
          severity: "CRITICAL",
          affectedSegment:
            "SHS-SEG-02",
        },

        startedAt:
          new Date(
            "2026-09-03T07:40:00.000Z",
          ),

        completedAt:
          new Date(
            "2026-09-03T07:42:00.000Z",
          ),
      },

      create: {
        id: ids.senseRun,

        agentType:
          AgentType.SENSE,

        status:
          AgentRunStatus.COMPLETED,

        trigger:
          "Scheduled regional risk assessment",

        inputSnapshot: {
          rainfallForecastMm: 42,
          soilSaturation: 0.81,
          fieldReports: 1,
          corridor:
            "EKH-SHS-01",
        },

        outputSnapshot: {
          riskScore: 84,
          severity: "CRITICAL",
          affectedSegment:
            "SHS-SEG-02",
        },

        startedAt:
          new Date(
            "2026-09-03T07:40:00.000Z",
          ),

        completedAt:
          new Date(
            "2026-09-03T07:42:00.000Z",
          ),
      },
    });

  const impactRun =
    await prisma.agentRun.upsert({
      where: {
        id: ids.impactRun,
      },

      update: {
        agentType:
          AgentType.IMPACT,

        status:
          AgentRunStatus.COMPLETED,

        trigger:
          "Critical corridor risk detected",

        inputSnapshot: {
          incident:
            "INC-EKH-2026-001",
          corridor:
            "EKH-SHS-01",
        },

        outputSnapshot: {
          communitiesAtRisk: 3,
          populationAffected: 15600,
          facilitiesThreatened: 1,
        },

        startedAt:
          new Date(
            "2026-09-03T07:42:00.000Z",
          ),

        completedAt:
          new Date(
            "2026-09-03T07:44:00.000Z",
          ),
      },

      create: {
        id: ids.impactRun,

        agentType:
          AgentType.IMPACT,

        status:
          AgentRunStatus.COMPLETED,

        trigger:
          "Critical corridor risk detected",

        inputSnapshot: {
          incident:
            "INC-EKH-2026-001",
          corridor:
            "EKH-SHS-01",
        },

        outputSnapshot: {
          communitiesAtRisk: 3,
          populationAffected: 15600,
          facilitiesThreatened: 1,
        },

        startedAt:
          new Date(
            "2026-09-03T07:42:00.000Z",
          ),

        completedAt:
          new Date(
            "2026-09-03T07:44:00.000Z",
          ),
      },
    });

  const routeRun =
    await prisma.agentRun.upsert({
      where: {
        id: ids.routeRun,
      },

      update: {
        agentType:
          AgentType.ROUTE,

        status:
          AgentRunStatus.COMPLETED,

        trigger:
          "Critical delivery route affected",

        inputSnapshot: {
          delivery:
            "DEL-EKH-2026-001",
          blockedSegment:
            "SHS-SEG-02",
        },

        outputSnapshot: {
          saferRouteFound: true,
          additionalMinutes: 18,
          revisedRiskScore: 28,
        },

        startedAt:
          new Date(
            "2026-09-03T07:44:00.000Z",
          ),

        completedAt:
          new Date(
            "2026-09-03T07:46:00.000Z",
          ),
      },

      create: {
        id: ids.routeRun,

        agentType:
          AgentType.ROUTE,

        status:
          AgentRunStatus.COMPLETED,

        trigger:
          "Critical delivery route affected",

        inputSnapshot: {
          delivery:
            "DEL-EKH-2026-001",
          blockedSegment:
            "SHS-SEG-02",
        },

        outputSnapshot: {
          saferRouteFound: true,
          additionalMinutes: 18,
          revisedRiskScore: 28,
        },

        startedAt:
          new Date(
            "2026-09-03T07:44:00.000Z",
          ),

        completedAt:
          new Date(
            "2026-09-03T07:46:00.000Z",
          ),
      },
    });

  const commandRun =
    await prisma.agentRun.upsert({
      where: {
        id: ids.commandRun,
      },

      update: {
        agentType:
          AgentType.COMMAND,

        status:
          AgentRunStatus.AWAITING_APPROVAL,

        trigger:
          "High-impact response requires authority review",

        inputSnapshot: {
          incident:
            "INC-EKH-2026-001",
          pendingActions: 2,
        },

        outputSnapshot: {
          approvalRequired: true,
          responsePriority:
            "CRITICAL",
        },

        startedAt:
          new Date(
            "2026-09-03T07:46:00.000Z",
          ),
      },

      create: {
        id: ids.commandRun,

        agentType:
          AgentType.COMMAND,

        status:
          AgentRunStatus.AWAITING_APPROVAL,

        trigger:
          "High-impact response requires authority review",

        inputSnapshot: {
          incident:
            "INC-EKH-2026-001",
          pendingActions: 2,
        },

        outputSnapshot: {
          approvalRequired: true,
          responsePriority:
            "CRITICAL",
        },

        startedAt:
          new Date(
            "2026-09-03T07:46:00.000Z",
          ),
      },
    });

  const toolCalls = [
    {
      id: ids.weatherTool,
      agentRunId:
        senseRun.id,
      toolName:
        "fetch_weather_forecast",
      request: {
        district:
          "East Khasi Hills",
      },
      response: {
        rainfallForecastMm: 42,
        warning:
          "Heavy rainfall",
      },
    },
    {
      id: ids.corridorTool,
      agentRunId:
        senseRun.id,
      toolName:
        "read_corridor_condition",
      request: {
        corridorCode:
          "EKH-SHS-01",
      },
      response: {
        riskScore: 84,
        segment:
          "SHS-SEG-02",
      },
    },
    {
      id: ids.impactTool,
      agentRunId:
        impactRun.id,
      toolName:
        "calculate_isolation_impact",
      request: {
        incidentReference:
          "INC-EKH-2026-001",
      },
      response: {
        communitiesAtRisk: 3,
        populationAffected: 15600,
      },
    },
    {
      id: ids.routeTool,
      agentRunId:
        routeRun.id,
      toolName:
        "optimise_safe_route",
      request: {
        deliveryReference:
          "DEL-EKH-2026-001",
      },
      response: {
        routeFound: true,
        riskScore: 28,
        additionalMinutes: 18,
      },
    },
    {
      id: ids.approvalTool,
      agentRunId:
        commandRun.id,
      toolName:
        "create_approval_request",
      request: {
        authorityRole:
          "GOVERNMENT_AUTHORITY",
      },
      response: {
        queueStatus:
          "AWAITING_APPROVAL",
      },
    },
  ];

  for (
    const toolCall of toolCalls
  ) {
    await prisma.agentToolCall.upsert({
      where: {
        id: toolCall.id,
      },

      update: {
        agentRunId:
          toolCall.agentRunId,

        toolName:
          toolCall.toolName,

        status:
          ToolCallStatus.SUCCEEDED,

        request:
          toolCall.request,

        response:
          toolCall.response,

        startedAt:
          new Date(
            "2026-09-03T07:42:00.000Z",
          ),

        completedAt:
          new Date(
            "2026-09-03T07:46:00.000Z",
          ),
      },

      create: {
        id: toolCall.id,

        agentRunId:
          toolCall.agentRunId,

        toolName:
          toolCall.toolName,

        status:
          ToolCallStatus.SUCCEEDED,

        request:
          toolCall.request,

        response:
          toolCall.response,

        startedAt:
          new Date(
            "2026-09-03T07:42:00.000Z",
          ),

        completedAt:
          new Date(
            "2026-09-03T07:46:00.000Z",
          ),
      },
    });
  }

  await prisma.routePlan.upsert({
    where: {
      id: ids.primaryRoute,
    },

    update: {
      deliveryId:
        delivery.id,

      corridorId:
        corridor.id,

      name:
        "Primary Shillong–Sohra route",

      type:
        RoutePlanType.PLANNED,

      distanceKm: 54,
      estimatedMinutes: 112,
      riskScore: 84,

      geometry: {
        type: "LineString",

        coordinates: [
          [91.8933, 25.5788],
          [91.7492, 25.4432],
          [91.7322, 25.2702],
        ],
      },

      instructions: {
        warning:
          "Restricted near Sohra approach.",
      },

      isRecommended: false,
      isApproved: false,
    },

    create: {
      id: ids.primaryRoute,

      deliveryId:
        delivery.id,

      corridorId:
        corridor.id,

      name:
        "Primary Shillong–Sohra route",

      type:
        RoutePlanType.PLANNED,

      distanceKm: 54,
      estimatedMinutes: 112,
      riskScore: 84,

      geometry: {
        type: "LineString",

        coordinates: [
          [91.8933, 25.5788],
          [91.7492, 25.4432],
          [91.7322, 25.2702],
        ],
      },

      instructions: {
        warning:
          "Restricted near Sohra approach.",
      },

      isRecommended: false,
      isApproved: false,
    },
  });

  await prisma.routePlan.upsert({
    where: {
      id: ids.saferRoute,
    },

    update: {
      deliveryId:
        delivery.id,

      corridorId:
        corridor.id,

      agentRunId:
        routeRun.id,

      name:
        "NERVE safer alternative route",

      type:
        RoutePlanType.ACTIVE,

      distanceKm: 61.5,
      estimatedMinutes: 130,
      riskScore: 28,

      geometry: {
        type: "LineString",

        coordinates: [
          [91.8933, 25.5788],
          [91.804, 25.472],
          [91.694, 25.355],
          [91.7135, 25.2581],
        ],
      },

      instructions: {
        summary:
          "Avoid restricted Sohra approach segment.",

        checkpoints: [
          "Shillong dispatch point",
          "Mawkdok safety checkpoint",
          "Mawmluh PHC",
        ],
      },

      isRecommended: true,
      isApproved: true,

      approvedAt:
        new Date(
          "2026-09-03T07:50:00.000Z",
        ),
    },

    create: {
      id: ids.saferRoute,

      deliveryId:
        delivery.id,

      corridorId:
        corridor.id,

      agentRunId:
        routeRun.id,

      name:
        "NERVE safer alternative route",

      type:
        RoutePlanType.ACTIVE,

      distanceKm: 61.5,
      estimatedMinutes: 130,
      riskScore: 28,

      geometry: {
        type: "LineString",

        coordinates: [
          [91.8933, 25.5788],
          [91.804, 25.472],
          [91.694, 25.355],
          [91.7135, 25.2581],
        ],
      },

      instructions: {
        summary:
          "Avoid restricted Sohra approach segment.",

        checkpoints: [
          "Shillong dispatch point",
          "Mawkdok safety checkpoint",
          "Mawmluh PHC",
        ],
      },

      isRecommended: true,
      isApproved: true,

      approvedAt:
        new Date(
          "2026-09-03T07:50:00.000Z",
        ),
    },
  });

  await prisma.agentRecommendation.upsert({
    where: {
      id:
        ids.restrictionRecommendation,
    },

    update: {
      agentRunId:
        senseRun.id,

      corridorId:
        corridor.id,

      roadSegmentId:
        segmentMawkdokSohra.id,

      incidentId:
        incident.id,

      agentType:
        AgentType.SENSE,

      type:
        RecommendationType.ROAD_RESTRICTION,

      priority:
        RecommendationPriority.CRITICAL,

      status:
        RecommendationStatus.AWAITING_APPROVAL,

      title:
        "Temporarily restrict heavy vehicles",

      reasoning:
        "Rainfall, slope saturation and verified field evidence indicate a high probability of road failure.",

      confidence: 0.93,

      evidence: {
        rainfallForecastMm: 42,
        riskScore: 84,
        verifiedFieldReports: 1,
      },

      proposedAction: {
        restriction:
          "HEAVY_VEHICLES",

        durationHours: 6,

        segment:
          "SHS-SEG-02",
      },

      requiresApproval: true,

      expiresAt:
        new Date(
          "2026-09-03T14:00:00.000Z",
        ),
    },

    create: {
      id:
        ids.restrictionRecommendation,

      agentRunId:
        senseRun.id,

      corridorId:
        corridor.id,

      roadSegmentId:
        segmentMawkdokSohra.id,

      incidentId:
        incident.id,

      agentType:
        AgentType.SENSE,

      type:
        RecommendationType.ROAD_RESTRICTION,

      priority:
        RecommendationPriority.CRITICAL,

      status:
        RecommendationStatus.AWAITING_APPROVAL,

      title:
        "Temporarily restrict heavy vehicles",

      reasoning:
        "Rainfall, slope saturation and verified field evidence indicate a high probability of road failure.",

      confidence: 0.93,

      evidence: {
        rainfallForecastMm: 42,
        riskScore: 84,
        verifiedFieldReports: 1,
      },

      proposedAction: {
        restriction:
          "HEAVY_VEHICLES",

        durationHours: 6,

        segment:
          "SHS-SEG-02",
      },

      requiresApproval: true,

      expiresAt:
        new Date(
          "2026-09-03T14:00:00.000Z",
        ),
    },
  });

  const routeRecommendation =
    await prisma.agentRecommendation.upsert({
      where: {
        id:
          ids.routeRecommendation,
      },

      update: {
        agentRunId:
          routeRun.id,

        corridorId:
          corridor.id,

        incidentId:
          incident.id,

        deliveryId:
          delivery.id,

        reviewedById:
          authority.id,

        agentType:
          AgentType.ROUTE,

        type:
          RecommendationType.ROUTE_CHANGE,

        priority:
          RecommendationPriority.HIGH,

        status:
          RecommendationStatus.APPROVED,

        title:
          "Use safer medical delivery route",

        reasoning:
          "The alternative avoids the restricted segment while keeping the health-centre delivery inside its service window.",

        confidence: 0.89,

        evidence: {
          originalRiskScore: 84,
          revisedRiskScore: 28,
          additionalMinutes: 18,
        },

        proposedAction: {
          routePlanId:
            ids.saferRoute,

          activateImmediately: true,
        },

        requiresApproval: true,

        reviewedAt:
          new Date(
            "2026-09-03T07:50:00.000Z",
          ),
      },

      create: {
        id:
          ids.routeRecommendation,

        agentRunId:
          routeRun.id,

        corridorId:
          corridor.id,

        incidentId:
          incident.id,

        deliveryId:
          delivery.id,

        reviewedById:
          authority.id,

        agentType:
          AgentType.ROUTE,

        type:
          RecommendationType.ROUTE_CHANGE,

        priority:
          RecommendationPriority.HIGH,

        status:
          RecommendationStatus.APPROVED,

        title:
          "Use safer medical delivery route",

        reasoning:
          "The alternative avoids the restricted segment while keeping the health-centre delivery inside its service window.",

        confidence: 0.89,

        evidence: {
          originalRiskScore: 84,
          revisedRiskScore: 28,
          additionalMinutes: 18,
        },

        proposedAction: {
          routePlanId:
            ids.saferRoute,

          activateImmediately: true,
        },

        requiresApproval: true,

        reviewedAt:
          new Date(
            "2026-09-03T07:50:00.000Z",
          ),
      },
    });

  await prisma.agentRecommendation.upsert({
    where: {
      id:
        ids.supplyRecommendation,
    },

    update: {
      agentRunId:
        impactRun.id,

      corridorId:
        corridor.id,

      incidentId:
        incident.id,

      agentType:
        AgentType.IMPACT,

      type:
        RecommendationType.PREPOSITION_SUPPLIES,

      priority:
        RecommendationPriority.HIGH,

      status:
        RecommendationStatus.AWAITING_APPROVAL,

      title:
        "Pre-position supplies for three communities",

      reasoning:
        "Mawmluh, Laitkynsew and Mawsmai may experience reduced primary access within the next nine hours.",

      confidence: 0.86,

      evidence: {
        communitiesAtRisk: 3,
        populationAffected: 15600,
        healthCentresThreatened: 1,
      },

      proposedAction: {
        deadline:
          "2026-09-03T12:30:00.000Z",

        supplies: [
          "Medicines",
          "Drinking water",
          "Emergency food",
        ],
      },

      requiresApproval: true,
    },

    create: {
      id:
        ids.supplyRecommendation,

      agentRunId:
        impactRun.id,

      corridorId:
        corridor.id,

      incidentId:
        incident.id,

      agentType:
        AgentType.IMPACT,

      type:
        RecommendationType.PREPOSITION_SUPPLIES,

      priority:
        RecommendationPriority.HIGH,

      status:
        RecommendationStatus.AWAITING_APPROVAL,

      title:
        "Pre-position supplies for three communities",

      reasoning:
        "Mawmluh, Laitkynsew and Mawsmai may experience reduced primary access within the next nine hours.",

      confidence: 0.86,

      evidence: {
        communitiesAtRisk: 3,
        populationAffected: 15600,
        healthCentresThreatened: 1,
      },

      proposedAction: {
        deadline:
          "2026-09-03T12:30:00.000Z",

        supplies: [
          "Medicines",
          "Drinking water",
          "Emergency food",
        ],
      },

      requiresApproval: true,
    },
  });

  await prisma.approvalDecision.upsert({
    where: {
      id: ids.approval,
    },

    update: {
      recommendationId:
        routeRecommendation.id,

      actorId:
        authority.id,

      decision:
        ApprovalDecisionType.APPROVED,

      comment:
        "Approved for immediate medical delivery rerouting.",

      decidedAt:
        new Date(
          "2026-09-03T07:50:00.000Z",
        ),
    },

    create: {
      id: ids.approval,

      recommendationId:
        routeRecommendation.id,

      actorId:
        authority.id,

      decision:
        ApprovalDecisionType.APPROVED,

      comment:
        "Approved for immediate medical delivery rerouting.",

      decidedAt:
        new Date(
          "2026-09-03T07:50:00.000Z",
        ),
    },
  });

  const [
    corridorCount,
    communityCount,
    incidentCount,
    deliveryCount,
    recommendationCount,
  ] = await Promise.all([
    prisma.roadCorridor.count(),
    prisma.community.count(),
    prisma.incident.count(),
    prisma.delivery.count(),
    prisma.agentRecommendation.count(),
  ]);

  console.log(
    "NERVE operational demo data is ready.",
  );

  console.log({
    corridors:
      corridorCount,

    communities:
      communityCount,

    incidents:
      incidentCount,

    deliveries:
      deliveryCount,

    recommendations:
      recommendationCount,
  });

  console.log(
    `Primary segment ready: ${segmentShillongMawkdok.code}`,
  );
}

seedOperationalData()
  .catch((error) => {
    console.error(
      "Operational seed failed:",
      error,
    );

    throw error;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });