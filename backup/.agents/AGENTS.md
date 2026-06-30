# AGENTS.md — Workspace Customization Rules

You MUST follow the Obsidian Knowledge Base workflow defined by the `obsidian-knowledge-base` skill during every task and iteration in this codebase.

## Obsidian Knowledge Base Integration

The project's local knowledge base is located at `.notes/` at the root of the workspace.

### 1. Pre-Implementation Phase (Session Start)
*   **Load Context**: Read the latest state of the project from [.notes/context/project-overview.md](file:///home/kittyboy06/Projects/Aash%20Player/.notes/context/project-overview.md) before starting any coding.
*   **Search Constraints**: Query `.notes/decisions/` for existing Architecture Decision Records (ADRs) and `.notes/bugs/` for past bug patterns that might affect the files or features you are about to modify.

### 2. Post-Implementation Phase (Session Completion)
Before completing any task or ending your turn, you must update the knowledge base:
*   **Create/Update ADRs**: If a new library, state management pattern, or major database schema design was introduced, create an ADR file under `.notes/decisions/` using the template defined in the `obsidian-knowledge-base` skill.
*   **Log Solved Bugs**: If a tricky, race-condition, or platform-specific bug was resolved, document it under `.notes/bugs/`.
*   **Update Project Overview**: Modify [.notes/context/project-overview.md](file:///home/kittyboy06/Projects/Aash%20Player/.notes/context/project-overview.md) to record the changes under `Recent Changes`, add any new open bugs to `Open Issues`, and update checklist tasks under `Next Development Phase`.
