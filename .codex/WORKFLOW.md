# Delivery workflow

1. **Explore** — Read affected files and identify the existing component, styling, state, and data boundaries.
2. **Plan** — Describe the smallest compatible change and call out risks or assumptions.
3. **Implement** — Make a narrow patch that follows local project patterns. Avoid unrelated cleanup.
4. **Verify** — Run the closest available checks. Review empty, loading, error, narrow-screen, keyboard, and reduced-motion behavior when relevant.
5. **Review** — Re-read the diff for regressions, exposed data, unsafe rendering, accessibility gaps, and accidental configuration changes.
6. **Handoff** — Summarize outcomes, files, verification, and any follow-up the requester should know about.
