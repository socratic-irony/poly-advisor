# Tool Activity Indicators Design

## Goal

Make the chat UI show what the advisor is doing while a response is being generated, then retain a concise record of the tools that actually participated in the completed answer.

## Approved behavior

- A request starts in `Thinking through the answer…` (or `Searching official Cal Poly pages…` when an explicit web search is forced).
- When the Responses API reports a local guidance function call, the loading indicator changes to `Looking up PHIL reference docs…` or `Looking up CLA reference docs…` before the local document search runs. A request for both documents gets a combined label.
- When a web-search call is reported, the loading indicator uses `Searching official Cal Poly pages…`. Because the current client uses a non-streaming Responses call, this is the best available live state for an automatically selected web search; the persistent tool record is authoritative about whether search was actually used.
- Once the answer is complete, the assistant message shows `Tools used` only for tools observed in that response: Web search, PHIL guidance, and/or CLA guidance.
- Status is cleared after success, errors, a new chat, and file-processing failures. It must not leak into the next request.

## Data model

- Add a shared `ToolStatus` union for transient loading states.
- Add a shared `ToolUsed` union for persisted per-message tool labels.
- Extend `Message` with optional `toolsUsed` so the record travels with the answer and remains visible after loading ends.

## Flow

1. `useChat` sets the transient status before the first Responses request.
2. It inspects returned output items, records any `web_search_call`, and updates the status before each guidance function execution. A frame boundary gives React a chance to paint the status before the next asynchronous operation.
3. Guidance arguments determine whether PHIL, CLA, or both labels are recorded.
4. The final assistant placeholder is updated with answer text, sources, suggestions, and the deduplicated `toolsUsed` list.
5. `ChatView` renders the mapped transient status; `Message` renders the persistent labels for completed assistant messages.

## Verification

Tests cover the loading label mapping, a guidance status visible while the local tool promise is pending, and persistent tool labels on an assistant message. The full project validation command remains the final gate.
