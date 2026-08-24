# CLA Guidance Retrieval Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add public-safe CLA Fall 2026 guidance to the GitHub Pages app and let the model retrieve relevant PHIL/CLA sections through a browser-side function tool instead of embedding whole documents in every prompt.

**Architecture:** Keep Markdown references in `public/` as static GitHub Pages assets. Add a local section scorer and a `search_advising_guidance` Responses API function tool; the model chooses whether to call it, and the browser returns bounded excerpts from the requested reference. Keep `web_search` available for current official Cal Poly verification.

**Tech Stack:** React, TypeScript, Vite, OpenAI Responses API, Vitest, Markdown assets.

---

### Task 1: Add regression tests for section retrieval

**Files:**
- Create: `src/utils/guidanceRetrieval.test.ts`
- Modify: `src/config/advisingConfig.ts`

**Step 1: Write the failing tests**

Cover document metadata, heading-based section parsing, query scoring, document filtering, bounded output, and no-result fallback behavior.

**Step 2: Run the focused tests**

Run: `npm test -- src/utils/guidanceRetrieval.test.ts`

Expected: FAIL because the retrieval helpers and CLA metadata do not exist yet.

**Step 3: Commit**

```bash
git add src/utils/guidanceRetrieval.test.ts src/config/advisingConfig.ts
git commit -m "test: define guidance retrieval behavior"
```

### Task 2: Add sanitized public guidance

**Files:**
- Create: `public/CLA_Faculty_Guidance_Fall_2026.md`

**Step 1: Write the sanitized Markdown**

Convert the source memo into clear Markdown sections covering syllabi, office hours, enrollment and add/drop, withdrawals, course modality, final examinations, grading and grade changes, advising, meeting patterns, and Fall 2026 faculty deadlines. Replace all individual names, signatures, email addresses, direct phone numbers, room numbers, and personal contact routes with role-level descriptions and instructions to verify current official pages.

**Step 2: Run a PII scan**

Run: `rg -n -i "@[a-z0-9.-]+|\b\(?\d{3}\)?[-. ]\d{3}[-. ]\d{4}\b|Kelly|Kate|Julie|Lauren|Sabrina|Alejandra|Catherine|Eric|Kara|Jamilet|Tia|Megan|Bennion|Murphy|Bett|Kolodziejski|Canady|Cebreros|Castro|Cuvelier|Hitchcock|Coronel|Kawazoe|Massey" public/CLA_Faculty_Guidance_Fall_2026.md`

Expected: no matches.

**Step 3: Commit**

```bash
git add public/CLA_Faculty_Guidance_Fall_2026.md
git commit -m "docs: add sanitized CLA fall guidance"
```

### Task 3: Implement static guidance loading and retrieval

**Files:**
- Modify: `src/config/advisingConfig.ts`
- Create: `src/utils/guidanceRetrieval.ts`
- Modify: `src/utils/advisingDocument.ts`
- Modify: `src/utils/advisingDocument.test.ts`

**Step 1: Implement the minimum helpers**

Define `phil` and `cla` document metadata, cache each fetched document, parse Markdown headings into sections, normalize query terms, score heading/body matches, and return a bounded plain-text result with the document label and section headings. Keep the existing PHIL loader exports working for compatibility, but stop using full-document prompt formatting in the chat flow.

**Step 2: Run focused tests**

Run: `npm test -- src/utils/guidanceRetrieval.test.ts src/utils/advisingDocument.test.ts`

Expected: PASS.

**Step 3: Commit**

```bash
git add src/config/advisingConfig.ts src/utils/guidanceRetrieval.ts src/utils/advisingDocument.ts src/utils/advisingDocument.test.ts
git commit -m "feat: retrieve relevant guidance sections locally"
```

### Task 4: Add the guidance function tool and prompt routing

**Files:**
- Create: `src/utils/guidanceTool.ts`
- Modify: `src/utils/chatPrompts.ts`
- Modify: `src/utils/chatPrompts.test.ts`

**Step 1: Write failing prompt/tool tests**

Assert that the system prompt instructs the model to use `search_advising_guidance` for relevant faculty and student questions, identifies the dual faculty/major-advisor role, and preserves official web verification. Assert the tool schema exposes `phil`, `cla`, and `both` document choices.

**Step 2: Implement the tool definition**

Create a strict function schema with `document` and `query` arguments and an executor that calls the local retrieval helper. Return a safe error string if a document cannot be loaded.

**Step 3: Run focused tests**

Run: `npm test -- src/utils/chatPrompts.test.ts`

Expected: PASS.

**Step 4: Commit**

```bash
git add src/utils/guidanceTool.ts src/utils/chatPrompts.ts src/utils/chatPrompts.test.ts
git commit -m "feat: expose guidance retrieval to the model"
```

### Task 5: Integrate the Responses API tool loop

**Files:**
- Modify: `src/hooks/useChat.ts`
- Modify: `src/hooks/useChat.test.ts`

**Step 1: Write failing hook tests**

Mock a first response containing a `search_advising_guidance` function call, then a follow-up response containing the final answer. Assert that the function output is sent with the correct `call_id`, that the guidance tool is present alongside web search, and that suggestion generation still happens only after the final answer.

**Step 2: Implement the loop**

Remove whole-document prompt loading from `createSystemContent`. Add the guidance function tool to the main Responses request. Detect function calls, execute them in the browser, send `function_call_output` with the model response context, and cap repeated tool turns to avoid loops. Preserve existing citation extraction, streaming, regeneration, email replies, and `previous_response_id` behavior.

**Step 3: Run focused tests**

Run: `npm test -- src/hooks/useChat.test.ts`

Expected: PASS.

**Step 4: Commit**

```bash
git add src/hooks/useChat.ts src/hooks/useChat.test.ts
git commit -m "feat: run browser-side guidance tool calls"
```

### Task 6: Document public guidance scope and validate deployment assets

**Files:**
- Modify: `README.md`
- Modify: `SPEC.md`

**Step 1: Add repository guidance**

Document that the app is used by a faculty member and major advisor for both faculty operations and student-facing advising, that bundled guidance is public-safe and role-based, and that current policies must still be checked on official Cal Poly pages.

**Step 2: Run full verification**

Run: `npm run validate`

Expected: all tests pass and the production build exits successfully.

**Step 3: Inspect the final asset set**

Run: `rg -n -i "@[a-z0-9.-]+|\b\(?\d{3}\)?[-. ]\d{3}[-. ]\d{4}\b|Kelly|Kate|Julie|Lauren|Sabrina|Alejandra|Catherine|Eric|Kara|Jamilet|Tia|Megan|Bennion|Murphy|Bett|Kolodziejski|Canady|Cebreros|Castro|Cuvelier|Hitchcock|Coronel|Kawazoe|Massey|CLA Faculty Information and Guidelines.*pdf" public README.md SPEC.md src`

Expected: no source-PDF or personal-identity matches in deployed guidance/configuration.

### Task 7: Delete the source PDF after verification

**Files:**
- Delete: `docs/CLA Faculty Information and Guidelines  Fall 2026.pdf`

**Step 1: Confirm the sanitized Markdown is present and PII scan is clean**

Run the scans from Tasks 2 and 6 again.

**Step 2: Delete only the identified source PDF**

Run: `rm -f -- "docs/CLA Faculty Information and Guidelines  Fall 2026.pdf"`

**Step 3: Verify the worktree and tests**

Run: `git status --short` and `npm run validate`

Expected: the PDF is absent, the sanitized Markdown and code changes remain, and validation passes.

**Step 4: Commit**

```bash
git add -u -- "docs/CLA Faculty Information and Guidelines  Fall 2026.pdf"
git commit -m "chore: remove source CLA PDF after sanitization"
```
