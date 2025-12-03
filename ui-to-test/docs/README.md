# UI-to-Test Documentation

This folder contains all specifications and technical documentation for the UI-to-Test project.

## Audience

- **Developers**: Implementation details, architecture, and API references
- **Contributors**: Coding standards, architecture decisions, and extension points
- **Product Stakeholders**: Requirements, features, and roadmap

## Folder Structure

```
docs/
├── docs.md                 # Documentation hub (start here)
├── README.md               # This file
├── requirements.md         # Product requirements
├── architecture.md         # System architecture overview
├── ui-specs.md            # CLI interface specifications
├── plan.md                # Implementation phases summary
├── architecture/          # Architecture deep dives
│   ├── recorder.md        # Playwright recording engine
│   ├── correlator.md      # UI-API correlation engine
│   ├── generator.md       # Test generation system
│   └── adapters.md        # Test framework adapters
└── plan/                  # Detailed phase plans
    ├── phase-1.md         # Foundation
    ├── phase-2.md         # API capture
    ├── phase-3.md         # Test generation
    └── phase-4.md         # Polish & extensibility
```

## Document Types

| Type | Naming | Purpose |
|------|--------|---------|
| Hub | `docs.md` | Central navigation and overview |
| Requirements | `requirements.md` | What the product should do |
| Architecture | `architecture*.md` | How the system is structured |
| Specifications | `*-specs.md` | Detailed interface/behavior specs |
| Plans | `plan*.md` | Implementation roadmap |

## Style Guidelines

### Markdown Conventions

- Use H1 (`#`) for document title only
- Use H2 (`##`) for major sections
- Use H3 (`###`) for subsections
- Use tables for structured data
- Use code blocks with language tags
- Use ASCII diagrams for architecture (no external images)

### Code Examples

- TypeScript for interfaces and type definitions
- Gherkin for BDD examples
- Bash for CLI examples
- JSON for data structures

### Diagrams

Use ASCII box drawings for architecture diagrams:

```
┌─────────┐     ┌─────────┐
│ Box A   │────▶│ Box B   │
└─────────┘     └─────────┘
```

## Maintenance

### When to Update

- **requirements.md**: When features are added, changed, or removed
- **architecture.md**: When system structure changes
- **ui-specs.md**: When CLI interface changes
- **plan/**: As phases are completed or revised

### Review Checklist

- [ ] Links in `docs.md` are valid
- [ ] Code examples compile/run
- [ ] ASCII diagrams render correctly
- [ ] Version numbers are current

## Contributing

1. Read `docs.md` for project overview
2. Review relevant architecture docs
3. Follow style guidelines above
4. Update `docs.md` if adding new documents
