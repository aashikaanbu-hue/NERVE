from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class InputModel(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        allow_inf_nan=False,
    )


class RouteCandidate(InputModel):
    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    distanceKm: float = Field(ge=0)
    estimatedMinutes: int = Field(ge=0)
    riskScore: float = Field(ge=0, le=100)
    hasGeometry: bool
    isApproved: bool
    isRecommended: bool


class DeliverySnapshot(InputModel):
    id: str = Field(min_length=1)
    referenceNumber: str = Field(min_length=1)

    priority: Literal[
        "NORMAL",
        "HIGH",
        "CRITICAL",
    ]

    status: str = Field(min_length=1)
    destinationCommunityId: str = Field(min_length=1)

    routeCandidates: list[
        RouteCandidate
    ] = Field(max_length=50)

    @model_validator(mode="after")
    def validate_unique_route_ids(self):
        ids = [
            item.id
            for item in self.routeCandidates
        ]

        if len(ids) != len(set(ids)):
            raise ValueError(
                "Duplicate route candidate IDs are not allowed."
            )

        return self


class RouteRequest(InputModel):
    agentRunId: str = Field(min_length=1)
    impactAgentRunId: str = Field(min_length=1)
    affectedCorridorId: str = Field(min_length=1)

    corridorRiskScore: float = Field(
        ge=0,
        le=100,
    )

    communitiesWithoutRecordedAlternative: int = Field(
        ge=0,
    )

    populationWithoutRecordedAlternative: int = Field(
        ge=0,
    )

    deliveries: list[
        DeliverySnapshot
    ] = Field(max_length=100)

    @model_validator(mode="after")
    def validate_unique_delivery_ids(self):
        ids = [
            item.id
            for item in self.deliveries
        ]

        if len(ids) != len(set(ids)):
            raise ValueError(
                "Duplicate delivery IDs are not allowed."
            )

        return self


class RouteDecision(BaseModel):
    deliveryId: str
    referenceNumber: str

    action: Literal[
        "RECOMMEND_RECORDED_ROUTE",
        "HOLD_FOR_ROUTE_VERIFICATION",
    ]

    selectedRoutePlanId: str | None
    selectedRouteName: str | None
    selectedRiskScore: float | None
    riskReduction: float | None
    reasons: list[str]


class RouteAnalysis(BaseModel):
    agentRunId: str
    impactAgentRunId: str
    affectedCorridorId: str

    status: Literal[
        "COMPLETED"
    ] = "COMPLETED"

    assessmentStatus: Literal[
        "ASSESSED",
        "PARTIAL",
        "INSUFFICIENT_DATA",
    ]

    methodology: str = (
        "recorded-route-screen-v1"
    )

    decisions: list[RouteDecision]
    metrics: dict[str, int]
    reasoning: str
    recommendedAction: str

    recommendationType: Literal[
        "ROUTE_CHANGE",
        "DELIVERY_HOLD",
        "FIELD_VERIFICATION",
    ]

    requiresApproval: bool = True
    nextAgent: Literal["COMMAND"] | None
    limitations: list[str]
    toolCalls: list[dict]
    analysedAt: str


# Prototype screen, not a calibrated route-safety threshold.
ROUTE_RISK_LIMIT = 60


def evaluate_route_candidates(
    payload: RouteRequest,
) -> list[RouteDecision]:
    decisions: list[RouteDecision] = []

    for delivery in payload.deliveries:
        eligible = [
            route
            for route in delivery.routeCandidates
            if route.hasGeometry
            and route.riskScore
            < payload.corridorRiskScore
            and route.riskScore
            < ROUTE_RISK_LIMIT
        ]

        eligible.sort(
            key=lambda route: (
                route.riskScore,
                route.estimatedMinutes,
                route.distanceKm,
                route.id,
            )
        )

        if eligible:
            selected = eligible[0]

            decisions.append(
                RouteDecision(
                    deliveryId=delivery.id,
                    referenceNumber=(
                        delivery.referenceNumber
                    ),
                    action=(
                        "RECOMMEND_RECORDED_ROUTE"
                    ),
                    selectedRoutePlanId=(
                        selected.id
                    ),
                    selectedRouteName=(
                        selected.name
                    ),
                    selectedRiskScore=(
                        selected.riskScore
                    ),
                    riskReduction=round(
                        payload.corridorRiskScore
                        - selected.riskScore,
                        2,
                    ),
                    reasons=[
                        "The route is already recorded with geometry.",
                        "Its stored risk score is below the affected corridor score.",
                        "A human must confirm current passability before dispatch.",
                    ],
                )
            )
        else:
            decisions.append(
                RouteDecision(
                    deliveryId=delivery.id,
                    referenceNumber=(
                        delivery.referenceNumber
                    ),
                    action=(
                        "HOLD_FOR_ROUTE_VERIFICATION"
                    ),
                    selectedRoutePlanId=None,
                    selectedRouteName=None,
                    selectedRiskScore=None,
                    riskReduction=None,
                    reasons=[
                        "No recorded route passes the prototype risk screen.",
                        "Do not invent or activate an unverified route.",
                        "Request current route evidence before movement.",
                    ],
                )
            )

    return decisions


def analyse_recorded_routes(
    payload: RouteRequest,
) -> RouteAnalysis:
    decisions = evaluate_route_candidates(
        payload
    )

    recommended = sum(
        item.action
        == "RECOMMEND_RECORDED_ROUTE"
        for item in decisions
    )

    holds = sum(
        item.action
        == "HOLD_FOR_ROUTE_VERIFICATION"
        for item in decisions
    )

    route_count = sum(
        len(delivery.routeCandidates)
        for delivery in payload.deliveries
    )

    metrics = {
        "deliveriesReviewed":
            len(payload.deliveries),

        "routeCandidatesReviewed":
            route_count,

        "routesRecommended":
            recommended,

        "deliveryHolds":
            holds,
    }

    if not decisions:
        assessment_status = (
            "INSUFFICIENT_DATA"
        )

        recommendation_type = (
            "FIELD_VERIFICATION"
        )

        next_agent = None

        action = (
            "No active delivery is recorded on the affected corridor. "
            "Continue monitoring and verify operational demand."
        )

    elif recommended == len(decisions):
        assessment_status = "ASSESSED"
        recommendation_type = "ROUTE_CHANGE"
        next_agent = "COMMAND"

        action = (
            "Send the recorded lower-risk route choices for named "
            "human approval before any delivery movement."
        )

    elif recommended:
        assessment_status = "PARTIAL"
        recommendation_type = "ROUTE_CHANGE"
        next_agent = "COMMAND"

        action = (
            "Review lower-risk recorded routes and hold deliveries "
            "that still lack a screened alternative."
        )

    else:
        assessment_status = (
            "INSUFFICIENT_DATA"
        )

        recommendation_type = (
            "DELIVERY_HOLD"
        )

        next_agent = "COMMAND"

        action = (
            "Hold affected deliveries and request verified route "
            "evidence before movement."
        )

    return RouteAnalysis(
        agentRunId=payload.agentRunId,
        impactAgentRunId=(
            payload.impactAgentRunId
        ),
        affectedCorridorId=(
            payload.affectedCorridorId
        ),
        assessmentStatus=(
            assessment_status
        ),
        decisions=decisions,
        metrics=metrics,

        reasoning=(
            f"Reviewed {len(payload.deliveries)} affected deliveries "
            f"and {route_count} recorded route candidates. "
            f"{recommended} lower-risk route choices passed the "
            f"prototype screen; {holds} deliveries require a hold "
            f"or more evidence."
        ),

        recommendedAction=action,
        recommendationType=(
            recommendation_type
        ),
        nextAgent=next_agent,

        limitations=[
            "Rule-based prototype; route scores are not calibrated probabilities.",
            "Only pre-recorded route plans were screened.",
            "Stored geometry does not prove current road passability.",
            "Weather, traffic, bridge capacity and vehicle constraints are incomplete.",
            "No route, delivery status or driver instruction is changed automatically.",
            "Every operational movement remains subject to named human approval.",
        ],

        toolCalls=[
            {
                "toolName":
                    "read_recorded_route_plans",

                "status":
                    "SUCCEEDED",

                "result": {
                    "deliveries":
                        len(payload.deliveries),

                    "routeCandidates":
                        route_count,
                },
            },
            {
                "toolName":
                    "screen_lower_risk_routes",

                "status":
                    "SUCCEEDED",

                "result": {
                    "decisions": [
                        item.model_dump()
                        for item in decisions
                    ],
                },
            },
        ],

        analysedAt=datetime.now(
            timezone.utc
        ).isoformat(),
    )
    