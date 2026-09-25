# NERVE Jury Demonstration Script

## Demo duration

Target duration: **4 minutes**

## One-line introduction

> NERVE is a human-supervised Agentic AI platform that predicts how landslide-related road disruption may affect community access and emergency logistics before authorities take action.

## Demo preparation

Before presenting:

1. Start PostgreSQL.
2. Start the Node API on port `4000`.
3. Start the FastAPI agent service on port `8000`.
4. Start the React web application on port `5173`.
5. Confirm both health endpoints.
6. Login as the Government Authority.
7. Keep the following pages ready:
   - Command overview
   - Field evidence
   - Agent activity
   - Approval centre
   - Alert centre

Health commands:

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:4000/api/v1/health"

Invoke-RestMethod `
  -Uri "http://127.0.0.1:8000/health"
```

Open the web application:

```powershell
Start-Process "http://localhost:5173"
```

## 0:00-0:30 - Problem and solution

### Show

Command Overview.

### Say

> During heavy rainfall in North Eastern India, a single road failure can cut off villages, healthcare facilities and essential deliveries. Existing systems often show a hazard after it is reported, but they do not clearly explain which communities may lose access or what authorities should review next.

> NERVE combines verified field evidence, corridor dependency, recorded routes and emergency-delivery context through four specialist agents. Every critical recommendation remains under named human authority control.

## 0:30-1:00 - Operational situation

### Show

Accessibility Map and Risk Intelligence.

### Say

> This dashboard shows the Shillong-Sohra essential access corridor, its current caution status and the communities depending on it.

> NERVE separates risk from impact. A high road-risk signal does not automatically mean that a village is isolated. The platform checks recorded connectivity before presenting potential exposure.

### Highlight

- Corridor status
- Risk score
- Linked communities
- Critical facility
- Potentially affected population

## 1:00-1:35 - Verified field evidence

### Show

Field Evidence:

```text
/dashboard/field-evidence
```

### Say

> A field official submits a geo-tagged observation with location, timestamp, description and optional media.

> The evidence does not enter the agent workflow automatically. A Government Authority must first verify it.

### Action

1. Select a pending report.
2. Review latitude and longitude.
3. Review observation text.
4. Review linked corridor.
5. Click **Verify evidence**.

### Say after verification

> Verification creates a database-backed Sense Agent run. From this point, every input, tool call, output and handoff is preserved.

## 1:35-2:35 - Agentic workflow

### Show

Agent Activity:

```text
/dashboard/agents
```

### Say

> The first agent is NERVE Sense. It validates the location and classifies field evidence such as slope movement, water seepage and road blockage indicators.

> NERVE Impact then checks which communities depend on the affected corridor and whether a recorded open alternative exists.

> NERVE Route compares only routes already stored in the platform. It does not invent a route, and stored geometry is not treated as proof of current passability.

> NERVE Command consolidates the verified evidence into an accountable action plan with prerequisites and a human-approval lock.

### Highlight

- Four-agent workflow cards
- Completed status
- Execution time
- Tool calls
- Input snapshot
- Verified output
- Confidence
- Recent executions
- Human oversight panel

### Important line

> These are explainable specialist agents, not an uncontrolled automation chain. Each agent has a bounded responsibility and produces evidence for the next stage.

## 2:35-3:20 - Human approval

### Show

Approval Centre:

```text
/dashboard/approvals
```

### Say

> The Command Agent has recommended reviewing a lower-risk recorded route for the critical delivery.

> The recommendation contains the corridor context, delivery reference, selected route, risk reduction, reasoning and operational prerequisites.

> The vehicle does not move automatically. A named Government Authority must approve, reject or request changes.

### Action

1. Select the pending Command recommendation.
2. Review evidence and proposed response.
3. Add a decision note if required.
4. Click **Approve action**.

### Highlight

- Final decision
- Named authority
- Decision timestamp
- Immutable review trail

### Say

> The approval is stored with the named actor and timestamp. In this MVP, approval records accountability but still does not automatically dispatch a real vehicle.

## 3:20-3:45 - Role-aware alert

### Show

Alert Centre:

```text
/dashboard/notifications
```

### Say

> Approved decisions are converted into role-aware operational alerts. Authorities, logistics teams, field officials and drivers can receive information relevant to their responsibilities.

### Highlight

- Severity
- Source agent
- Confidence
- Delivery state
- Corridor and incident context
- Acknowledgement controls

## 3:45-4:00 - Closing statement

### Say

> NERVE's differentiator is the Connectivity Impact Engine. It connects hazard evidence to community accessibility and essential logistics while keeping human authority accountable.

> NERVE does not claim certainty. It exposes evidence, assumptions, limitations and every decision trace so authorities can act earlier and more responsibly.

## Backup demo workflow

If the selected field report is already verified:

1. Open Agent Activity.
2. Select the latest NERVE Command execution.
3. Show the complete `Sense -> Impact -> Route -> Command` trace.
4. Open Approval Centre.
5. Select the approved recommendation.
6. Show the named reviewer and immutable decision history.
7. Open Alert Centre.
8. Show the resulting operational alert.

## Technical verification for jury

Run:

```powershell
cd C:\Users\AASHIKA\Downloads\NERVE_Day2_Foundation

Set-ExecutionPolicy `
  -Scope Process `
  -ExecutionPolicy Bypass `
  -Force

& ".\scripts\day19-smoke.ps1"
```

Expected result:

```text
ALL 20 TESTS PASSED
Human authority remains in control.
```

## Architecture explanation

If asked how the system works:

> The React frontend sends authenticated requests to the Express business API. PostgreSQL stores operational data, agent runs, tool calls, recommendations and decisions. The API calls the FastAPI specialist-agent service and persists every result. Command recommendations enter the approval queue, where a named Government Authority records the final decision.

## Why this is Agentic AI

If asked whether NERVE uses Agentic AI:

> Yes. NERVE uses four goal-oriented specialist agents with bounded responsibilities. Each agent receives structured evidence, uses defined tools, produces an explainable result and hands work to the next specialist. The agents operate autonomously within analysis boundaries, while critical real-world action remains human supervised.

## Why it is not unsafe automation

If asked about safety:

> Every critical recommendation has `requiresApproval` enabled. Command actions also include `executionBlockedUntilApproval`. The platform records recommendations and decisions but does not automatically close roads, dispatch vehicles or claim confirmed isolation.

## Accuracy explanation

If asked whether the scores are predictions:

> The current MVP uses explainable deterministic rules for demonstration. Scores are not calibrated probabilities. A production version would require validated rainfall, terrain, historical landslide and live road data, followed by model calibration and field testing.

## Connectivity-impact explanation

If asked about isolation:

> NERVE reports that a community has no recorded open alternative under the supplied corridor data. This represents potential exposure in a corridor-failure scenario. It does not claim confirmed physical isolation because road-network coverage and live passability may be incomplete.

## Route explanation

If asked how routes are selected:

> NERVE Route evaluates only pre-recorded route plans with stored geometry and risk information. A lower stored risk score can support a recommendation, but field teams must confirm current passability before dispatch.

## Data sources for production extension

A production version can integrate:

- IMD rainfall forecasts
- Satellite rainfall estimates
- Soil-moisture products
- SRTM or ASTER elevation data
- Historical landslide inventories
- OpenStreetMap road networks
- District and village boundaries
- Live field reports
- Vehicle telemetry

## Key differentiators

1. Predicts potential loss of access, not only hazard intensity.
2. Connects communities, facilities, corridors and deliveries.
3. Uses four bounded specialist agents.
4. Preserves complete tool and decision traces.
5. Requires named human approval.
6. Separates potential exposure from confirmed isolation.
7. Does not silently execute critical actions.

## Final jury takeaway

> NERVE turns verified local evidence into explainable, supervised preparedness decisions so communities can preserve access before a road failure becomes a humanitarian emergency.