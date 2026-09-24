from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class InputModel(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class CorridorSnapshot(InputModel):
    id: str = Field(min_length=1)
    status: Literal[
        "ACCESSIBLE", "CAUTION", "RESTRICTED", "CLOSED", "UNKNOWN"
    ]
    riskScore: float = Field(ge=0, le=100)


class CommunitySnapshot(InputModel):
    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    population: int | None = Field(default=None, ge=0)
    criticalFacilityCount: int = Field(ge=0)
    corridors: list[CorridorSnapshot] = Field(max_length=100)


class ImpactRequest(InputModel):
    agentRunId: str = Field(min_length=1)
    senseAgentRunId: str = Field(min_length=1)
    fieldReportId: str = Field(min_length=1)
    senseRiskScore: float = Field(ge=0, le=100)
    affectedCorridorId: str | None = Field(default=None, min_length=1)
    communities: list[CommunitySnapshot] = Field(max_length=1000)

    @model_validator(mode="after")
    def validate_unique_ids(self):
        ids = [item.id for item in self.communities]

        if len(ids) != len(set(ids)):
            raise ValueError("Duplicate community IDs are not allowed.")

        for community in self.communities:
            links = [item.id for item in community.corridors]

            if len(links) != len(set(links)):
                raise ValueError("Duplicate corridor links are not allowed.")

        return self


class CommunityImpact(BaseModel):
    communityId: str
    name: str
    population: int | None
    criticalFacilityCount: int
    assessment: Literal[
        "NO_RECORDED_OPEN_ALTERNATIVE",
        "ALTERNATIVE_REQUIRES_REVIEW",
        "INSUFFICIENT_DATA",
    ]
    candidateCorridorIds: list[str]
    reasons: list[str]


class ImpactAnalysis(BaseModel):
    agentRunId: str
    senseAgentRunId: str
    fieldReportId: str
    status: Literal["COMPLETED"] = "COMPLETED"
    assessmentStatus: Literal["ASSESSED", "PARTIAL", "INSUFFICIENT_DATA"]
    methodology: str = "corridor-dependency-scenario-v1"
    affectedCorridorId: str | None
    communities: list[CommunityImpact]
    metrics: dict[str, int]
    reasoning: str
    recommendedAction: str
    recommendationType: Literal["PREPOSITION_SUPPLIES", "FIELD_VERIFICATION"]
    requiresApproval: bool = True
    nextAgent: Literal["ROUTE"] | None
    limitations: list[str]
    toolCalls: list[dict]
    analysedAt: str


# A prototype screening threshold, not a calibrated safety boundary.
ALTERNATIVE_RISK_LIMIT = 60


def assess_corridor_dependencies(
    payload: ImpactRequest,
) -> list[CommunityImpact]:
    results = []

    for community in payload.communities:
        linked = any(
            corridor.id == payload.affectedCorridorId
            for corridor in community.corridors
        )

        alternatives = [
            corridor for corridor in community.corridors
            if corridor.id != payload.affectedCorridorId
        ]

        candidates = [
            corridor.id for corridor in alternatives
            if corridor.status == "ACCESSIBLE"
            and corridor.riskScore < ALTERNATIVE_RISK_LIMIT
        ]

        if not linked:
            assessment = "INSUFFICIENT_DATA"
            candidates = []
            reasons = ["No recorded link to the affected corridor."]

        elif candidates:
            assessment = "ALTERNATIVE_REQUIRES_REVIEW"
            reasons = [
                "Recorded alternative corridors pass the prototype screen.",
                "End-to-end connectivity and current conditions need checking.",
            ]

        elif any(item.status != "CLOSED" for item in alternatives):
            assessment = "INSUFFICIENT_DATA"
            reasons = [
                "Other corridor links exist, but none pass the screen.",
                "Do not interpret uncertain access as confirmed isolation.",
            ]

        else:
            assessment = "NO_RECORDED_OPEN_ALTERNATIVE"
            reasons = [
                "No open alternative is recorded in the supplied links.",
                "If the affected corridor fails, access may be disrupted.",
                "Missing road data may hide other alternatives.",
            ]

        results.append(
            CommunityImpact(
                communityId=community.id,
                name=community.name,
                population=community.population,
                criticalFacilityCount=community.criticalFacilityCount,
                assessment=assessment,
                candidateCorridorIds=candidates,
                reasons=reasons,
            )
        )

    return results


def summarise_community_exposure(
    results: list[CommunityImpact],
) -> dict[str, int]:
    potentially_isolated = [
        item for item in results
        if item.assessment == "NO_RECORDED_OPEN_ALTERNATIVE"
    ]

    return {
        "communitiesReviewed": len(results),
        "noRecordedOpenAlternative": len(potentially_isolated),
        "alternativeRequiresReview": sum(
            item.assessment == "ALTERNATIVE_REQUIRES_REVIEW"
            for item in results
        ),
        "insufficientData": sum(
            item.assessment == "INSUFFICIENT_DATA"
            for item in results
        ),
        "knownPopulationWithoutRecordedAlternative": sum(
            item.population if item.population is not None else 0
            for item in potentially_isolated
        ),
        "unknownPopulationCommunitiesWithoutRecordedAlternative": sum(
            item.population is None
            for item in potentially_isolated
        ),
        "facilitiesWithoutRecordedAlternative": sum(
            item.criticalFacilityCount
            for item in potentially_isolated
        ),
    }


def analyse_connectivity(payload: ImpactRequest) -> ImpactAnalysis:
    results = assess_corridor_dependencies(payload)
    metrics = summarise_community_exposure(results)
    uncertain = metrics["insufficientData"]

    if not results or uncertain == len(results):
        assessment_status = "INSUFFICIENT_DATA"
    elif uncertain:
        assessment_status = "PARTIAL"
    else:
        assessment_status = "ASSESSED"

    high_risk = payload.senseRiskScore >= 60

    propose_supplies = (
        high_risk and metrics["noRecordedOpenAlternative"] > 0
    )

    can_assess_routes = (
        high_risk and assessment_status != "INSUFFICIENT_DATA"
    )

    action = (
        "Review contingency supply positioning and verify delivery access."
        if propose_supplies
        else "Verify corridor links and current access before operational action."
    )

    return ImpactAnalysis(
        agentRunId=payload.agentRunId,
        senseAgentRunId=payload.senseAgentRunId,
        fieldReportId=payload.fieldReportId,
        assessmentStatus=assessment_status,
        affectedCorridorId=payload.affectedCorridorId,
        communities=results,
        metrics=metrics,
        reasoning=(
            f"Reviewed {len(results)} supplied communities. "
            f"{metrics['noRecordedOpenAlternative']} have no recorded open "
            f"alternative; {uncertain} have insufficient connectivity data. "
            "This is a corridor-failure scenario, not confirmed isolation."
        ),
        recommendedAction=action,
        recommendationType=(
            "PREPOSITION_SUPPLIES"
            if propose_supplies
            else "FIELD_VERIFICATION"
        ),
        nextAgent="ROUTE" if can_assess_routes else None,
        limitations=[
            "Rule-based prototype; scores are not calibrated probabilities.",
            "Corridor links are not a complete road-network graph.",
            "Only supplied communities are assessed; coverage may be incomplete.",
            "Corridor freshness and route independence are not verified.",
            "Population figures are potential exposure, not confirmed casualties.",
            "Isolation duration and prediction confidence are not estimated.",
            "No road closure, dispatch or approval is executed.",
        ],
        toolCalls=[
            {
                "toolName": "assess_corridor_dependencies",
                "status": "SUCCEEDED",
                "result": {
                    "communities": [
                        item.model_dump() for item in results
                    ],
                },
            },
            {
                "toolName": "summarise_community_exposure",
                "status": "SUCCEEDED",
                "result": metrics,
            },
        ],
        analysedAt=datetime.now(timezone.utc).isoformat(),
    )