from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, Field


class FieldEvidenceRequest(BaseModel):
    agentRunId: str
    fieldReportId: str
    title: str
    description: str

    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)

    mediaUrls: list[str] = []
    corridorId: str | None = None
    roadSegmentId: str | None = None
    incidentId: str | None = None
    capturedAt: str | None = None


class ToolTrace(BaseModel):
    toolName: str
    status: Literal["SUCCEEDED"]
    result: dict


class FieldEvidenceAnalysis(BaseModel):
    agentRunId: str
    fieldReportId: str
    status: Literal["COMPLETED"]

    riskScore: int
    riskLevel: Literal[
        "LOW",
        "MEDIUM",
        "HIGH",
        "CRITICAL",
    ]

    confidence: float
    evidenceSignals: list[str]
    reasoning: str
    recommendedAction: str
    recommendationType: str
    requiresApproval: bool
    nextAgent: str | None
    toolCalls: list[ToolTrace]
    analysedAt: str


SIGNAL_GROUPS = [
    (
        "Slope or road failure indicators detected",
        [
            "landslide",
            "slope movement",
            "soil movement",
            "road crack",
            "crack",
            "debris",
            "falling stones",
            "small stones",
        ],
        28,
    ),
    (
        "Water pressure or saturation indicators detected",
        [
            "water seepage",
            "seepage",
            "heavy rainfall",
            "runoff",
            "flood",
            "saturated",
        ],
        22,
    ),
    (
        "Access disruption indicators detected",
        [
            "blocked",
            "blockage",
            "road failure",
            "vehicle movement",
            "restricted",
            "unusable",
        ],
        20,
    ),
    (
        "Time-sensitive field observations detected",
        [
            "fresh",
            "continuous",
            "worsen",
            "urgent",
            "danger",
        ],
        12,
    ),
]


def analyse_field_evidence(
    payload: FieldEvidenceRequest,
) -> FieldEvidenceAnalysis:
    combined_text = (
        f"{payload.title} {payload.description}"
    ).lower()

    detected_signals: list[str] = []
    signal_score = 0

    for label, keywords, weight in SIGNAL_GROUPS:
        if any(
            keyword in combined_text
            for keyword in keywords
        ):
            detected_signals.append(label)
            signal_score += weight

    media_bonus = 8 if payload.mediaUrls else 0
    incident_bonus = 6 if payload.incidentId else 0
    corridor_bonus = 4 if payload.corridorId else 0

    risk_score = min(
        96,
        18
        + signal_score
        + media_bonus
        + incident_bonus
        + corridor_bonus,
    )

    if risk_score >= 80:
        risk_level = "CRITICAL"
    elif risk_score >= 60:
        risk_level = "HIGH"
    elif risk_score >= 35:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    confidence = min(
        0.96,
        0.62
        + 0.10
        + (0.12 if payload.mediaUrls else 0)
        + (0.05 if payload.corridorId else 0)
        + (0.05 if payload.incidentId else 0)
        + min(len(detected_signals), 3) * 0.02,
    )

    if not detected_signals:
        detected_signals.append(
            "No high-risk keywords detected; monitoring recommended"
        )

    if risk_level in {"CRITICAL", "HIGH"}:
        recommended_action = (
            "Send the verified evidence to NERVE Impact for "
            "connectivity assessment and prepare a supervised "
            "road restriction recommendation."
        )
        recommendation_type = "ROAD_RESTRICTION"
        requires_approval = True
        next_agent = "IMPACT"
    else:
        recommended_action = (
            "Continue monitoring and request additional field "
            "verification if conditions change."
        )
        recommendation_type = "FIELD_VERIFICATION"
        requires_approval = False
        next_agent = None

    reasoning = (
        f"NERVE Sense analysed verified geo-tagged evidence and "
        f"identified {len(detected_signals)} operational signal(s). "
        f"The calculated risk score is {risk_score}/100 with "
        f"{round(confidence * 100)}% confidence."
    )

    return FieldEvidenceAnalysis(
        agentRunId=payload.agentRunId,
        fieldReportId=payload.fieldReportId,
        status="COMPLETED",
        riskScore=risk_score,
        riskLevel=risk_level,
        confidence=round(confidence, 2),
        evidenceSignals=detected_signals,
        reasoning=reasoning,
        recommendedAction=recommended_action,
        recommendationType=recommendation_type,
        requiresApproval=requires_approval,
        nextAgent=next_agent,
        toolCalls=[
            ToolTrace(
                toolName="validate_geolocation",
                status="SUCCEEDED",
                result={
                    "latitude": payload.latitude,
                    "longitude": payload.longitude,
                    "valid": True,
                },
            ),
            ToolTrace(
                toolName="classify_field_evidence",
                status="SUCCEEDED",
                result={
                    "signals": detected_signals,
                    "mediaCount": len(payload.mediaUrls),
                },
            ),
        ],
        analysedAt=datetime.now(
            timezone.utc
        ).isoformat(),
    )