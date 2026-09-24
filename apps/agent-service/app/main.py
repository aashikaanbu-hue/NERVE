from datetime import datetime, timezone

from fastapi import FastAPI
from pydantic import BaseModel
from app.agents.sense import (
    FieldEvidenceAnalysis,
    FieldEvidenceRequest,
    analyse_field_evidence,
)
app = FastAPI(
    title="NERVE Agent Service",
    description="Human-supervised Agentic AI orchestration service",
    version="0.1.0",
)


class AgentDefinition(BaseModel):
    code: str
    name: str
    purpose: str
    status: str = "planned"


AGENTS = [
    AgentDefinition(code="sense", name="NERVE Sense", purpose="Explainable road-risk intelligence"),
    AgentDefinition(code="impact", name="NERVE Impact", purpose="Connectivity and isolation forecasting"),
    AgentDefinition(code="route", name="NERVE Route", purpose="Risk-aware route recommendation"),
    AgentDefinition(code="command", name="NERVE Command", purpose="Response planning and monitoring"),
]


@app.get("/health")
async def health() -> dict:
    return {
        "status": "healthy",
        "service": "nerve-agent-service",
        "version": "0.1.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/api/v1/agents", response_model=list[AgentDefinition])
async def list_agents() -> list[AgentDefinition]:
    return AGENTS
@app.post(
    "/api/v1/agents/sense/analyse-field-report",
    response_model=FieldEvidenceAnalysis,
)
async def analyse_verified_field_report(
    payload: FieldEvidenceRequest,
) -> FieldEvidenceAnalysis:
    return analyse_field_evidence(payload)