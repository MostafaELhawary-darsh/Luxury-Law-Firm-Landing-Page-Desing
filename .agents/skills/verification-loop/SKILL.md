---
name: verification-loop
description: Verify React project changes through a focused, repeatable implementation and review loop.
---

# Verification loop

After a change, identify the closest existing check and run it when available. At minimum, inspect the diff and confirm the intended path still compiles conceptually with the project’s current imports and interfaces.

For UI work, exercise the main interaction and its empty, loading, and error paths where applicable. Check a narrow viewport, keyboard navigation, focus visibility, and copy or layout overflow. For fixes, reproduce the original issue first when practical and verify that the regression is covered by an existing or narrowly added check.

Report commands/checks actually run, their outcomes, and checks that could not be performed.
