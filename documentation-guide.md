# Documentation Setup & Maintenance Guide

Use this playbook to bootstrap and scale documentation in any new project.

## 1. Establish the Documentation Hub
- Create `docs/docs.md` as the top-level index.
- Link to essentials: requirements, UI previews, plans, architecture, onboarding.
- Keep descriptions concise so contributors can scan quickly.

## 2. Create a Public-Facing README
- In `docs/README.md`, describe the intent of the folder (audience, file types, style expectations).
- Embed an example tree and link back to the docs hub for discoverability.

## 3. Plan Structure
- Add `docs/plan.md` summarizing phases (table format works well).
- For each phase, create `docs/plan/phase-X.md` capturing:
  - Goal & scope
  - Checklist with Markdown boxes
  - Notes/owners/dependencies
- Keep top-level plan lean—details live in the phase files.

## 4. Architecture Records
- Maintain `docs/architecture.md` for the bird’s-eye view (diagram, data flow, open questions).
- As the system grows, add `docs/architecture/` subfiles (e.g., backend, infra, UI) and reference them from the main doc to avoid bloat.

## 5. Working vs. Archived Content
- Reserve a git-ignored folder (e.g., `windsurf/`) for personal notes or scratchpads.
- Use an `archive/` directory (tracked) for deprecated specs/mocks with a short note in each file explaining why it was archived.

## 6. Documentation Workflow Tips
- Whenever a new stream of work starts, add/extend the relevant phase or architecture subfile.
- Update `docs/docs.md` when new high-value docs appear, so the hub stays accurate.
- Encourage contributors to add a README to every new subfolder describing purpose and maintenance rules.

## 7. Sharing Across Projects
- Copy this pattern directly or treat it as a checklist for existing repos.
- Adjust phase names or architecture breakdowns per project needs, but keep the hub/plan/architecture triad.

## 8. Maintenance Cadence
- At each milestone review, quickly scan:
  - `docs/docs.md` for stale links.
  - Phase checklists for progress accuracy.
  - Architecture open questions—either resolve or document blockers.

Keeping documentation modular, indexed, and versioned like this ensures teams can scale context without overwhelming contributors.
