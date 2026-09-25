# NERVE Platform

**North Eastern Region Vision & Efficiency**

> Predict Risk. Preserve Access. Protect Communities.

NERVE is a human-supervised Agentic AI platform for landslide-risk intelligence, community accessibility forecasting and emergency logistics coordination in North Eastern India.

The platform transforms verified field evidence into explainable risk assessments, connectivity impact analysis, safer recorded-route recommendations and accountable action plans. Critical operational actions always remain under named human authority control.

## Problem

Heavy rainfall and landslides can block critical road corridors with limited warning. This can:

- Isolate remote communities
- Delay medicines, drinking water and emergency supplies
- Threaten access to healthcare facilities
- Force vehicles onto unsafe routes
- Create fragmented decision-making between field teams and authorities

NERVE helps authorities understand potential impact before taking operational action.

## Core agent workflow

```mermaid
flowchart LR
    A[Verified field evidence] --> B[NERVE Sense]
    B --> C[NERVE Impact]
    C --> D[NERVE Route]
    D --> E[NERVE Command]
    E --> F[Human Approval]
    F --> G[Operational Alert]
```

| Agent | Responsibility | Output |
|---|---|---|
| NERVE Sense | Analyses verified geo-tagged field evidence | Explainable risk score and evidence signals |
| NERVE Impact | Assesses corridor dependency and potential community exposure | Communities without a recorded open alternative |
| NERVE Route | Compares pre-recorded route plans | Lower-risk route or delivery-hold recommendation |
| NERVE Command | Consolidates agent evidence | Human-reviewable operational action plan |

## Human supervision

NERVE agents can:

- Read verified operational evidence
- Apply deterministic decision rules
- Call auditable tools
- Explain their reasoning
- Produce recommendations
- Hand work to the next specialist agent

NERVE agents cannot:

- Close a road automatically
- Dispatch a vehicle automatically
- Change delivery movement without authority approval
- Claim that potential exposure is confirmed isolation
- Treat stored route geometry as proof of live passability

Every critical recommendation is stored with:

- Agent input and output snapshots
- Tool-call records
- Evidence references
- Confidence information
- Named reviewer
- Decision timestamp
- Immutable approval history

## Platform features

- Role-based authentication
- Government Authority workspace
- Command overview dashboard
- Accessibility and community-impact map
- Risk intelligence workspace
- Recorded-route planning
- Delivery operations
- Explainable supply prioritisation
- Human approval centre
- Role-aware alert centre
- Geo-tagged field evidence review
- Four-agent orchestration centre
- Agent input, output and tool-call inspection
- Database-backed decision audit trail
- End-to-end safety smoke tests

## Application screens

| Route | Screen |
|---|---|
| `/dashboard` | Command overview |
| `/dashboard/accessibility` | Accessibility map |
| `/dashboard/risk-intelligence` | Risk intelligence |
| `/dashboard/route-planning` | Route planning |
| `/dashboard/deliveries` | Delivery operations |
| `/dashboard/supply-priorities` | Supply priorities |
| `/dashboard/approvals` | Approval centre |
| `/dashboard/notifications` | Alert centre |
| `/dashboard/field-evidence` | Field evidence |
| `/dashboard/agents` | Agent activity |

## Technology stack

### Web application

- React
- TypeScript
- Vite
- React Router
- Lucide icons

### Business API

- Node.js
- Express
- TypeScript
- Prisma ORM
- PostgreSQL
- Zod validation
- JWT authentication
- Helmet
- CORS
- Request rate limiting

### Agent service

- Python 3.12
- FastAPI
- Pydantic
- Uvicorn
- Explainable rule-based specialist agents

## Repository structure

```text
NERVE_Day2_Foundation/
|-- apps/
|   |-- web/
|   |   `-- src/
|   |       |-- lib/
|   |       `-- pages/
|   |-- api/
|   |   |-- prisma/
|   |   |   |-- migrations/
|   |   |   |-- schema.prisma
|   |   |   |-- seed.ts
|   |   |   `-- seed-operational.ts
|   |   `-- src/
|   |       |-- config/
|   |       |-- lib/
|   |       |-- middleware/
|   |       `-- modules/
|   `-- agent-service/
|       |-- app/
|       |   `-- agents/
|       `-- requirements.txt
|-- docs/
|   |-- architecture.md
|   `-- DEMO_SCRIPT.md
|-- scripts/
|   `-- day19-smoke.ps1
|-- .env.example
|-- package.json
`-- README.md
```

## Prerequisites

Install:

- Node.js 20 or later
- npm
- Python 3.12
- PostgreSQL 17
- Git

## Environment configuration

Copy the example environment file for the API:

```powershell
Copy-Item `
  ".\.env.example" `
  ".\apps\api\.env"
```

Update `apps/api/.env` with your PostgreSQL credentials and a strong JWT secret:

```env
NODE_ENV=development
WEB_PORT=5173
API_PORT=4000
VITE_API_URL=http://localhost:4000/api/v1
AGENT_SERVICE_URL=http://localhost:8000
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/nerve_db
JWT_SECRET=replace-with-a-long-random-secret
```

Never commit real passwords or production secrets.

## Install Node.js dependencies

From the repository root:

```powershell
npm.cmd install
```

## Configure the Python agent service

```powershell
cd .\apps\agent-service

py -3.12 -m venv .venv

& ".\.venv\Scripts\python.exe" `
  -m pip install `
  -r requirements.txt
```

## Prepare the database

Ensure PostgreSQL is running and the configured database exists.

```powershell
cd .\apps\api

npx.cmd prisma migrate deploy `
  --schema prisma\schema.prisma

npx.cmd prisma generate `
  --schema prisma\schema.prisma
```

Seed the base and operational demonstration data:

```powershell
npx.cmd tsx prisma\seed.ts

npx.cmd tsx prisma\seed-operational.ts
```

## Run locally

Use three terminals.

### Terminal 1 - Business API

```powershell
cd C:\path\to\NERVE_Day2_Foundation

npm.cmd run dev:api
```

API:

```text
http://localhost:4000
```

### Terminal 2 - Agent service

```powershell
cd C:\path\to\NERVE_Day2_Foundation\apps\agent-service

& ".\.venv\Scripts\python.exe" `
  -m uvicorn app.main:app `
  --reload `
  --port 8000
```

Agent service:

```text
http://127.0.0.1:8000
```

FastAPI documentation:

```text
http://127.0.0.1:8000/docs
```

### Terminal 3 - Web application

```powershell
cd C:\path\to\NERVE_Day2_Foundation

npm.cmd run dev:web
```

Web application:

```text
http://localhost:5173
```

## Health verification

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:4000/api/v1/health"

Invoke-RestMethod `
  -Uri "http://127.0.0.1:8000/health"
```

Expected result:

- NERVE API is healthy
- Agent service is online
- FastAPI agent service is healthy

## Quality verification

### TypeScript typecheck

```powershell
cd C:\path\to\NERVE_Day2_Foundation

npm.cmd run typecheck
```

### Production web build

```powershell
cd .\apps\web

npm.cmd run build
```

### Python compile check

```powershell
cd ..\agent-service

& ".\.venv\Scripts\python.exe" `
  -m compileall app
```

### End-to-end safety smoke tests

Start all three services, then run:

```powershell
cd C:\path\to\NERVE_Day2_Foundation

Set-ExecutionPolicy `
  -Scope Process `
  -ExecutionPolicy Bypass `
  -Force

& ".\scripts\day19-smoke.ps1"
```

The smoke suite verifies:

- API health
- Agent-service health
- Authentication enforcement
- Invalid-input rejection
- Sense Agent execution
- Impact Agent execution
- Route Agent execution
- Command Agent execution
- Tool-call success
- Human approval enforcement
- Automatic execution blocking

Expected final output:

```text
ALL 20 TESTS PASSED
Human authority remains in control.
```

## Key API groups

```text
/api/v1/health
/api/v1/auth
/api/v1/operations
/api/v1/notifications
/api/v1/supply-priorities
/api/v1/field-reports
```

Agent-service endpoints:

```text
/api/v1/agents
/api/v1/agents/sense/analyse-field-report
/api/v1/agents/impact/analyse-connectivity
/api/v1/agents/route/analyse-recorded-routes
/api/v1/agents/command/build-action-plan
```

## Demonstration workflow

1. Open Field Evidence.
2. Select a pending geo-tagged report.
3. Verify the evidence as a Government Authority.
4. NERVE Sense analyses field-risk signals.
5. NERVE Impact assesses potential community exposure.
6. NERVE Route compares recorded route plans.
7. NERVE Command creates a supervised action plan.
8. Open Agent Activity to inspect the complete trace.
9. Open Approval Centre to approve, reject or request changes.
10. Open Alert Centre to inspect role-aware operational communication.

See [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) for the complete jury demonstration.

## Responsible-AI limitations

This project is an explainable rule-based prototype.

- Scores are not calibrated probabilities.
- Community exposure is potential exposure, not confirmed isolation.
- Population totals are not casualty estimates.
- Recorded routes may not reflect current physical conditions.
- Field and corridor data may be incomplete or stale.
- Human review and live field confirmation are mandatory.
- The platform does not automatically move vehicles or close roads.

## Documentation

- [System architecture](docs/architecture.md)
- [Jury demo script](docs/DEMO_SCRIPT.md)

## Project status

The current MVP includes:

- PostgreSQL-backed operational data
- Authenticated role-aware workspaces
- Four specialist agent workflows
- Explainable evidence and tool traces
- Human approval controls
- Operational notifications
- Field evidence ingestion and verification
- Supply-priority decision support
- End-to-end safety validation