# Model and Splash Update Design

## Goal

Update Poly Advisor to use `gpt-5.6-luna` consistently and simplify the empty-chat splash tip without changing its layout.

## Scope

- Replace the previous model identifier with `gpt-5.6-luna` in runtime defaults, the model selector, test fixtures, the standalone Responses API example, and `SPEC.md`.
- Keep the existing blue splash-tip container.
- Change the tip copy to `Drag .eml email files here for instant replies`, removing the `New:` prefix and final exclamation point.
- Do not add or retain exact-model or exact-tip regression assertions; verify through the existing suite and production build.

## Implementation

The model remains a single available option in the existing settings interface. No model-selection behavior or request flow changes beyond the identifier. The splash keeps its current structure and styling; only the rendered copy changes.

## Verification

Run the repository's existing test suite and production build. Confirm the old model identifier and removed splash punctuation no longer appear in active project files.
