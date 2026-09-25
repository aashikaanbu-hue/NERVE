from datetime import datetime, timezone
from typing import Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    model_validator,
)


class InputModel(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        allow_inf_nan=False,
    )


class RouteDecisionInput(InputModel):
    deliveryId: str = Field(
        min_length=1,
    )

    referenceNumber: str = Field(
        min_length=1,
    )

    action: Literal[
        "RECOMMEND_RECORDED_ROUTE",
        "HOLD_FOR_ROUTE_VERIFICATION",
    ]

    selectedRoutePlanId: str | None
    selectedRouteName: str | None

    selectedRiskScore: (
        float | None
    ) = Field(
        default=None,
        ge=0,
        le=100,
    )

    riskReduction: (
        float | None
    ) = Field(
        default=None,
        ge=0,
    )

    reasons: list[str] = Field(
        min_length=1,
    )

    @model_validator(mode="after")
    def validate_route_decision(self):
        if (
            self.action
            == "RECOMMEND_RECORDED_ROUTE"
        ):
            if (
                self.selectedRoutePlanId
                is None
                or self.selectedRouteName
                is None
                or self.selectedRiskScore
                is None
                or self.riskReduction
                is None
            ):
                raise ValueError(
                    "A recommended route must include "
                    "its recorded route details."
                )

        if (
            self.action
            == "HOLD_FOR_ROUTE_VERIFICATION"
        ):
            if (
                self.selectedRoutePlanId
                is not None
                or self.selectedRouteName
                is not None
                or self.selectedRiskScore
                is not None
                or self.riskReduction
                is not None
            ):
                raise ValueError(
                    "A delivery hold must not contain "
                    "a selected route."
                )

        return self


class CommandRequest(InputModel):
    agentRunId: str = Field(
        min_length=1,
    )

    routeAgentRunId: str = Field(
        min_length=1,
    )

    affectedCorridorId: str = Field(
        min_length=1,
    )

    corridorRiskScore: float = Field(
        ge=0,
        le=100,
    )

    communitiesWithoutRecordedAlternative: (
        int
    ) = Field(
        ge=0,
    )

    populationWithoutRecordedAlternative: (
        int
    ) = Field(
        ge=0,
    )

    decisions: list[
        RouteDecisionInput
    ] = Field(
        max_length=100,
    )

    @model_validator(mode="after")
    def validate_unique_deliveries(self):
        delivery_ids = [
            decision.deliveryId
            for decision in self.decisions
        ]

        if (
            len(delivery_ids)
            != len(set(delivery_ids))
        ):
            raise ValueError(
                "Duplicate delivery decisions "
                "are not allowed."
            )

        return self


class CommandPlan(BaseModel):
    deliveryId: str
    referenceNumber: str

    recommendationType: Literal[
        "ROUTE_CHANGE",
        "DELIVERY_HOLD",
    ]

    priority: Literal[
        "HIGH",
        "CRITICAL",
    ]

    title: str
    reasoning: str

    confidence: float = Field(
        ge=0,
        le=1,
    )

    evidence: dict
    proposedAction: dict

    requiresApproval: bool = True


class CommandAnalysis(BaseModel):
    agentRunId: str
    routeAgentRunId: str
    affectedCorridorId: str

    status: Literal[
        "COMPLETED"
    ] = "COMPLETED"

    assessmentStatus: Literal[
        "READY_FOR_REVIEW",
        "NO_ACTIONS",
    ]

    methodology: str = (
        "human-supervised-action-plan-v1"
    )

    plans: list[CommandPlan]
    metrics: dict[str, int]

    reasoning: str
    recommendedAction: str

    requiresApproval: bool
    nextAgent: None = None

    limitations: list[str]
    toolCalls: list[dict]
    analysedAt: str


def priority_for(
    payload: CommandRequest,
    decision: RouteDecisionInput,
) -> Literal[
    "HIGH",
    "CRITICAL",
]:
    if (
        decision.action
        == "HOLD_FOR_ROUTE_VERIFICATION"
    ):
        return "CRITICAL"

    if (
        payload.corridorRiskScore >= 80
        or
        payload
        .populationWithoutRecordedAlternative
        >= 10000
    ):
        return "CRITICAL"

    return "HIGH"


def confidence_for(
    decision: RouteDecisionInput,
) -> float:
    if (
        decision.action
        == "HOLD_FOR_ROUTE_VERIFICATION"
    ):
        return 0.76

    if (
        decision.riskReduction
        is not None
        and decision.riskReduction >= 30
    ):
        return 0.86

    return 0.81


def build_supervised_plans(
    payload: CommandRequest,
) -> list[CommandPlan]:
    plans: list[CommandPlan] = []

    for decision in payload.decisions:
        priority = priority_for(
            payload,
            decision,
        )

        confidence = confidence_for(
            decision,
        )

        common_evidence = {
            "routeAgentRunId":
                payload.routeAgentRunId,

            "affectedCorridorId":
                payload.affectedCorridorId,

            "corridorRiskScore":
                payload.corridorRiskScore,

            "communitiesWithoutRecordedAlternative":
                payload
                .communitiesWithoutRecordedAlternative,

            "populationWithoutRecordedAlternative":
                payload
                .populationWithoutRecordedAlternative,

            "decisionReasons":
                decision.reasons,

            "potentialExposureOnly":
                True,
        }

        if (
            decision.action
            == "RECOMMEND_RECORDED_ROUTE"
        ):
            plans.append(
                CommandPlan(
                    deliveryId=(
                        decision.deliveryId
                    ),

                    referenceNumber=(
                        decision.referenceNumber
                    ),

                    recommendationType=(
                        "ROUTE_CHANGE"
                    ),

                    priority=priority,

                    title=(
                        "Review lower-risk route for "
                        + decision
                        .referenceNumber
                    ),

                    reasoning=(
                        "NERVE Route identified the "
                        "pre-recorded route "
                        f"'{decision.selectedRouteName}' "
                        "as lower risk than the affected "
                        "corridor. Stored geometry does "
                        "not confirm current passability, "
                        "so named authority approval and "
                        "field confirmation are required "
                        "before movement."
                    ),

                    confidence=confidence,

                    evidence={
                        **common_evidence,

                        "selectedRoutePlanId":
                            decision
                            .selectedRoutePlanId,

                        "selectedRouteName":
                            decision
                            .selectedRouteName,

                        "selectedRiskScore":
                            decision
                            .selectedRiskScore,

                        "riskReduction":
                            decision
                            .riskReduction,
                    },

                    proposedAction={
                        "action":
                            "APPROVE_RECORDED_ROUTE",

                        "deliveryId":
                            decision.deliveryId,

                        "routePlanId":
                            decision
                            .selectedRoutePlanId,

                        "routeName":
                            decision
                            .selectedRouteName,

                        "executionBlockedUntilApproval":
                            True,

                        "prerequisites": [
                            "Confirm current route passability.",
                            "Confirm driver and vehicle readiness.",
                            "Record a named authority decision.",
                        ],
                    },

                    requiresApproval=True,
                )
            )

        else:
            plans.append(
                CommandPlan(
                    deliveryId=(
                        decision.deliveryId
                    ),

                    referenceNumber=(
                        decision.referenceNumber
                    ),

                    recommendationType=(
                        "DELIVERY_HOLD"
                    ),

                    priority="CRITICAL",

                    title=(
                        "Hold "
                        + decision.referenceNumber
                        + " pending route verification"
                    ),

                    reasoning=(
                        "No recorded route passed the "
                        "prototype risk screen. The "
                        "delivery must remain unchanged "
                        "until current route evidence is "
                        "reviewed by a named authority."
                    ),

                    confidence=confidence,

                    evidence={
                        **common_evidence,

                        "selectedRoutePlanId":
                            None,

                        "selectedRouteName":
                            None,
                    },

                    proposedAction={
                        "action":
                            "HOLD_DELIVERY",

                        "deliveryId":
                            decision.deliveryId,

                        "executionBlockedUntilApproval":
                            True,

                        "prerequisites": [
                            "Collect current route evidence.",
                            "Verify at least one recorded route.",
                            "Record a named authority decision.",
                        ],
                    },

                    requiresApproval=True,
                )
            )

    return plans


def analyse_command_plan(
    payload: CommandRequest,
) -> CommandAnalysis:
    plans = build_supervised_plans(
        payload
    )

    route_changes = sum(
        plan.recommendationType
        == "ROUTE_CHANGE"
        for plan in plans
    )

    delivery_holds = sum(
        plan.recommendationType
        == "DELIVERY_HOLD"
        for plan in plans
    )

    critical = sum(
        plan.priority == "CRITICAL"
        for plan in plans
    )

    metrics = {
        "decisionsReviewed":
            len(payload.decisions),

        "recommendationsPrepared":
            len(plans),

        "routeChanges":
            route_changes,

        "deliveryHolds":
            delivery_holds,

        "criticalActions":
            critical,
    }

    if plans:
        assessment_status = (
            "READY_FOR_REVIEW"
        )

        recommended_action = (
            "Submit the prepared operational "
            "recommendations to the Approval "
            "Centre for named human review."
        )

    else:
        assessment_status = "NO_ACTIONS"

        recommended_action = (
            "No operational action was prepared. "
            "Continue monitoring."
        )

    return CommandAnalysis(
        agentRunId=payload.agentRunId,

        routeAgentRunId=(
            payload.routeAgentRunId
        ),

        affectedCorridorId=(
            payload.affectedCorridorId
        ),

        assessmentStatus=(
            assessment_status
        ),

        plans=plans,
        metrics=metrics,

        reasoning=(
            f"Reviewed {len(payload.decisions)} "
            "Route agent decisions and prepared "
            f"{len(plans)} human-supervised "
            "operational recommendations. "
            f"{critical} require critical-priority "
            "authority attention."
        ),

        recommendedAction=(
            recommended_action
        ),

        requiresApproval=bool(plans),

        limitations=[
            "Rule-based prototype; confidence values are heuristic evidence-completeness scores.",
            "Potential community exposure is not confirmed isolation or casualty data.",
            "Recorded route geometry does not prove current passability.",
            "No route, delivery status or driver instruction is changed automatically.",
            "Every operational action remains locked until named human approval.",
        ],

        toolCalls=[
            {
                "toolName":
                    "consolidate_agent_evidence",

                "status":
                    "SUCCEEDED",

                "result": {
                    "routeDecisions":
                        len(payload.decisions),

                    "potentialCommunities":
                        payload
                        .communitiesWithoutRecordedAlternative,

                    "potentialPopulation":
                        payload
                        .populationWithoutRecordedAlternative,
                },
            },
            {
                "toolName":
                    "build_supervised_action_plan",

                "status":
                    "SUCCEEDED",

                "result": {
                    "recommendations": [
                        {
                            "deliveryId":
                                plan.deliveryId,

                            "type":
                                plan
                                .recommendationType,

                            "priority":
                                plan.priority,

                            "requiresApproval":
                                plan
                                .requiresApproval,
                        }
                        for plan in plans
                    ],
                },
            },
        ],

        analysedAt=datetime.now(
            timezone.utc
        ).isoformat(),
    )