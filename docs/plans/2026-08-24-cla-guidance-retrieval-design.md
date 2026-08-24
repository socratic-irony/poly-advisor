# CLA Guidance Retrieval Design

## Goal

Make the advisor consult relevant CLA and PHIL guidance on demand through a browser-side Responses API function, while publishing only a sanitized, public-safe CLA reference.

## Architecture

The GitHub Pages deployment will host Markdown guidance files as static assets. The browser will expose a `search_advising_guidance` function tool to the Responses API; when the model decides the question needs bundled guidance, the app will fetch the requested Markdown file, select relevant sections locally, and return those sections as tool output. The model will then answer using the retrieved guidance and the existing Cal Poly web search tool.

The CLA reference will preserve operational policy and Fall 2026 dates but remove personal names, personal email addresses, direct phone numbers, office locations tied to individuals, and other identifying details. The prompt and README will state that the primary user is a faculty member and major advisor who handles both faculty operations and student-facing advising.

## Data flow

1. The user asks a question in the existing chat or email-reply flow.
2. The app sends the system/developer/user messages plus the existing `web_search` tool and the new guidance-search function tool.
3. The model may call `search_advising_guidance` with `document` (`phil`, `cla`, or `both`) and a focused query.
4. The browser loads only the requested static Markdown file(s), scores Markdown sections against the query, and returns a bounded set of relevant sections.
5. The app sends the function output back through the Responses API, preserving the conversation and tool call.
6. The model produces the final cited answer; current policy/date questions remain subject to official Cal Poly web verification.

## Public-safety rules

- Do not publish the source PDF.
- Do not copy individual faculty, dean, advisor, staff, or analyst names into the public Markdown.
- Do not copy personal or role-specific email addresses, direct phone numbers, room numbers, or signatures.
- Retain role-level routing, policy identifiers, official process names, dates, and generic references to CLA, Registrar, Academic Senate, Mustang Success Center, and CLA Advising.
- Tell the model that the sanitized reference is contextual guidance, not a substitute for current official pages.

## Testing and verification

- Unit-test Markdown section parsing and relevance selection.
- Unit-test guidance loading, caching, and error fallback.
- Unit-test the prompt’s tool instructions and public-safety routing language.
- Test the hook’s function-call round trip and ensure the existing suggestion request remains separate.
- Run the full Vitest suite and production build.
- Inspect the sanitized Markdown for names, email addresses, phone numbers, and the source PDF path before deleting the PDF.
