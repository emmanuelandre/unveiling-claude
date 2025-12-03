# PromptOps Documentation

This folder contains all technical documentation for the PromptOps platform.

## Audience

- **Developers**: Architecture docs, API specs, implementation guides
- **Product Managers**: Requirements, roadmap, UI specifications
- **DevOps/SRE**: Infrastructure, deployment, observability docs

## Folder Structure

```
docs/
├── docs.md                 # Documentation hub (start here)
├── README.md               # This file
├── requirements.md         # Product requirements
├── architecture.md         # System architecture overview
├── ui-specs.md             # UI specifications
├── plan.md                 # Implementation roadmap
├── plan/
│   ├── phase-1.md          # Foundation phase
│   ├── phase-2.md          # Core features phase
│   ├── phase-3.md          # Advanced features phase
│   └── phase-4.md          # Enterprise readiness phase
└── architecture/
    ├── backend.md          # Go API architecture
    ├── frontend.md         # React frontend architecture
    ├── ai-layer.md         # LangGraph and AI integration
    └── infrastructure.md   # Kubernetes and observability
```

## Style Guide

- Use Markdown for all documentation
- Keep files focused on a single topic
- Use tables for structured data
- Include diagrams where helpful (ASCII or linked images)
- Update `docs.md` when adding new high-value documents

## Maintenance

- Review documentation at each milestone
- Archive deprecated docs in `archive/` with explanation
- Keep phase checklists updated with progress

## Entry Point

Start with [docs.md](docs.md) for navigation to all documentation.
