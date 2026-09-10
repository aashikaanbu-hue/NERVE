# NERVE Runtime Architecture

```mermaid
flowchart LR
    W["React PWA"] --> A["Node API"]
    A --> D["PostgreSQL + PostGIS"]
    A --> G["FastAPI Agent Service"]
    G --> A
```

- The browser communicates only with the Node API.
- The Node API owns authentication, business rules and persistence.
- The Agent service owns stateful agent workflows and model inference.
- Agent tools call validated API functions; they never receive unrestricted database access.
