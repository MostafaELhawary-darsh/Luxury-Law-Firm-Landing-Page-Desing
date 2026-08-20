---
name: security-review
description: Perform a lightweight security review tailored to React interface and integration changes.
---

# Security review

Review changed code for exposed credentials, client-side authorization assumptions, unsafe HTML rendering, open redirects, unvalidated URLs, and error messages that reveal sensitive implementation details. Keep secrets in the project’s established protected configuration path; never place them in components, documentation examples, or client bundles.

Treat all browser-provided and remote values as untrusted. Encode output through normal React rendering, validate inputs at trust boundaries, and use existing authorization and backend checks rather than duplicating trust decisions in the interface.

Before handoff, state material security considerations for the change and flag anything that needs a server-side or deployment-level review.
