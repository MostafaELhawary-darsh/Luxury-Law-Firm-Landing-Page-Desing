---
name: frontend-patterns
description: Build consistent, responsive, accessible React interface changes using existing project patterns.
---

# Frontend patterns

Start from existing components and style primitives; extend them before creating a parallel design system. Keep presentational concerns close to the relevant component and keep data fetching, transformation, and side effects easy to trace.

Design for narrow and wide viewports. Preserve keyboard access, visible focus, readable contrast, and meaningful landmarks. Use buttons for actions and links for navigation. Treat loading, empty, and error states as first-class UI states whenever data or asynchronous work is involved.

Avoid injecting untrusted HTML. Validate or constrain user-controlled display values, and do not expose internal errors directly to visitors.
