# NERVE Platform

**North Eastern Region Vision & Efficiency**  
*Predict Risk. Preserve Access. Protect Communities.*

Human-supervised Agentic AI platform for weather-aware logistics and accessibility intelligence in North Eastern India.

## Applications

- `apps/web` — React + TypeScript role-based PWA shell
- `apps/api` — Node.js + Express business API
- `apps/agent-service` — Python + FastAPI Agentic AI service

## Local development

```bash
npm install
npm run dev:api
npm run dev:web
```

In another terminal:

```bash
cd apps/agent-service
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

URLs:

- Web: http://localhost:5173
- API health: http://localhost:4000/api/v1/health
- Agent docs: http://localhost:8000/docs

## Day 2 scope

This foundation verifies the web, business API and agent service boundaries. PostgreSQL/PostGIS, authentication and domain modules are added from Day 3 onward.
