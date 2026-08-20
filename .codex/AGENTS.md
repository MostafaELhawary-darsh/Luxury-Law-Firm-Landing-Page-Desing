# Codex instructions for this project

Use repository-local guidance in `.agents/skills/` when it matches the task. Treat the application and its deployment/data configuration as separate concerns: do not change configuration, migrations, or server functions as a side effect of UI work.

Keep patches scoped. Reuse existing components, tokens, and patterns before introducing abstractions. Ask for confirmation before actions that change external services, credentials, production data, or published content.

At handoff, state the user-visible result, modified paths, and verification performed.
