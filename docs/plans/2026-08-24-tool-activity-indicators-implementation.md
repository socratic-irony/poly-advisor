# Tool Activity Indicators Implementation Plan

1. Add shared transient and persisted tool types and document the approved behavior.
2. Add failing component and hook tests for status labels, live guidance status, and persistent tool labels.
3. Implement status tracking and tool-use collection in `useChat`, including frame yields, reset paths, and message updates.
4. Render the transient status in `ChatView`, persistent tool labels in `Message`, and thread the hook state through `App`.
5. Run targeted tests, then `npm run validate`; review the diff and commit the completed change.
