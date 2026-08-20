# Project collaboration guide

For the repository delivery sequence, read `.codex/WORKFLOW.md`. Load a matching workflow from `.agents/skills/` when its description fits the requested change.

Keep each change focused on the requested outcome. Inspect the relevant UI, data flow, and conventions before editing. Prefer small, reversible patches and preserve the visual language already established in the project.

Do not modify generated files, secrets, deployment settings, or database/schema assets unless the task explicitly requires it. Run the most relevant available verification after a change, then report modified files, checks run, and any remaining uncertainty.

For larger work, follow this order: explore the affected area, plan the smallest safe change, implement it, and independently review behavior, accessibility, responsiveness, and security implications.
