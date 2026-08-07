# Model and Splash Update Implementation Plan

**Goal:** Make `gpt-5.6-luna` Poly Advisor's consistent model identifier and remove `New:` plus the final exclamation point from the splash tip.

**Approach:** Work directly on `main` as explicitly requested. Update runtime, UI, fixture, example, and specification references without adding model- or copy-specific regression tests.

## Implementation

1. Replace the previous model identifier with `gpt-5.6-luna` in the settings default, model option, existing test fixtures, standalone Responses API example, and `SPEC.md`.
2. Keep the blue splash-tip container and change its copy to `Drag .eml email files here for instant replies`.
3. Remove the existing settings assertion that locks a specific model name and the empty-state assertion that locks exact tip copy.
4. Confirm no stale model or splash-label references remain in active files.
5. Run the existing Vitest suite and Vite production build.
