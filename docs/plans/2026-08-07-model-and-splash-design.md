# Model and Splash Update Design

## Goal

Update Poly Advisor to use `gpt-5.6-luna` consistently and simplify the empty-chat splash tip without changing its layout.

## Scope

- Replace `gpt-5.4-mini` with `gpt-5.6-luna` in runtime defaults, the model selector, tests, the standalone Responses API example, and `SPEC.md`.
- Keep the existing blue splash-tip container.
- Change the tip copy to `Drag .eml email files here for instant replies`, removing the `New:` prefix and final exclamation point.
- Add focused regression coverage for the model selector/default and exact splash wording.

## Implementation

The model remains a single available option in the existing settings interface. No model-selection behavior or request flow changes beyond the identifier. The splash keeps its current structure and styling; only the rendered copy changes.

## Verification

Run focused Vitest coverage first, followed by the repository's full validation command so both the test suite and production build are checked.
