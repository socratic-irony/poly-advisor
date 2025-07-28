**Spec: Poly Advisor — Cal Poly Web Search + Answer SPA (client‑only)**

---

## 1) Goal

Build a single‑page web app with a simple chat UI that:

* Accepts a natural‑language question (or pasted email thread).
* Uses OpenAI **Responses API** with the hosted **web search** tool to search across **`*.calpoly.edu`**.
* Synthesizes an answer **with inline, clickable citations** and a **Sources** list (URLs open in new tabs).
* Runs **entirely client‑side** (BYOK: user supplies their OpenAI API key) so it can be deployed to **GitHub Pages** (`poly-advisor`).
* Requires **no backend**; an optional tiny proxy is a future enhancement.

---

## 2) Constraints & Assumptions

* **Identity:** Advisor is **RJ** (Philosophy).
* **Default student major:** **PHIL**, unless otherwise noted.
* **Tone:** Conversational and clear; provide **step‑by‑step** instructions when processes/forms/approvals are involved.
* **Domain scope:** All of `*.calpoly.edu`.
* **Freshness rule:** Cite the **most recent** relevant policy/catalog year; if that year isn’t available, **link the closest official source** and label it.
* **Search depth:** Default **Medium** with a **High** toggle.
* **Links:** Open in a **new tab** (`target="_blank" rel="noopener"`).
* **History:** Defer persistent chat history for now (no `localStorage` messages); only store the **API key** locally.
* **Email‑reply signature block:**

  ```
  Let me know if you have any questions or concerns. Thank you!

  Best,
  Ryan
  ```

---

## 3) Users & Scenarios (examples)

* **Faculty/Advisors (RJ):** Clarify policies, deadlines, forms; draft replies to student emails with citations.
* **Students/Staff:** Ask procedural questions (add/drop, major change, advising appointments, catalog rules).
* **Email thread paste:** App infers roles (RJ vs. student) and drafts a concise, cited reply with the signature block.

---

## 4) Functional Requirements

1. **Chat UI**

   * Multiline input; **Enter** sends, **Shift+Enter** inserts newline.
   * Buttons: **Ask**, **New chat**, **Clear screen**, **Settings** (API key, model, search depth Medium/High, “Force web search”).
   * Progressive rendering (streaming optional; safe to implement non‑streaming first).

2. **Search + Answer**

   * Every user turn triggers an **OpenAI Responses API** request with the **web search** tool enabled.
   * Restrict results to **`*.calpoly.edu`** (prefer tool‑level allowlist if available; otherwise enforce via prompts).
   * Answers include **inline citations** and a **Sources** list with titles + URLs (open in new tabs).
   * When processes are involved, produce **actionable sequences** (e.g., “Email Dr. X → fill out Form Y → submit to Registrar”).

3. **Email‑thread helper**

   * Detect email threads (heuristics: headers like “From:”, “Subject:”, or “On … wrote:”).
   * Infer roles: **RJ = advisor**; other party = student.
   * Output: concise reply with cited Cal Poly URLs + **signature block** appended.

4. **Follow‑ups**

   * Maintain conversational state via **`previous_response_id`** for multi‑turn context within a session.

5. **Freshness & Ambiguity**

   * Prefer the **most recent** official pages; **ask a brief clarifying question** if info is ambiguous/missing.

---

## 5) Non‑Functional Requirements

* **Client‑only** (BYOK). No secret keys in source.
* **Browsers:** Latest Chrome/Edge/Safari/Firefox.
* **Accessibility:** Semantic labels, keyboard navigation, visible focus, `aria-live="polite"`.
* **Performance:** Minimal JS (vanilla or small footprint).
* **Resilience:** Graceful error messages for key issues, rate limits, and network failures.

---

## 6) Architecture

* **Frontend only** (HTML/CSS/JS or TS).
* **API key**: Entered by user, stored in **`localStorage`**; “Forget Key” clears it.
* **OpenAI access**: OpenAI JS SDK in browser (`dangerouslyAllowBrowser: true`) **or** `fetch` to `/v1/responses`.
* **State**: `previous_response_id` tracked in memory for the open tab; no transcript persistence (yet).
* **Optional later**: tiny serverless proxy to avoid BYOK and centralize safety/quotas.

---

## 7) Model & Tools

* **Model:** `gpt-4.1` (primary) or `gpt-4o` (fallback).
* **Tools:** `[{ type: "web_search" }]` (or `web_search_preview` where appropriate).
* **Tool choice:** `"auto"` by default; **force** via UI toggle.
* **Search depth:** If the tool exposes depth/context controls, set **Medium** by default; **High** when toggled. If not supported, encode depth preference in the **system prompt**.

---

## 8) Prompt Design (ready to copy)

**System (prepend on every call)**
You are a Cal Poly advisor assistant. Use the web search tool and restrict yourself to results from `*.calpoly.edu`. Prefer the most recent official policy, catalog, Registrar, and department advising pages. When a user asks about processes (forms, approvals, who to contact), give clear step‑by‑step instructions. If the exact academic year is unclear, cite the most recent year you can find and label it; if the specific year is not available, link the closest official source. Always include inline citations in the body and a “Sources” list with titles and URLs. Use absolute dates like “July 28, 2025.” If information seems ambiguous or missing on calpoly.edu, ask a brief clarifying question before committing to an answer. Tone: conversational but clear.

**Developer (fixed)**
Identity and defaults: The advisor is **RJ** (Philosophy). Assume the student’s major is **PHIL** unless otherwise stated. For pasted email threads, infer roles (RJ = advisor) and produce a concise reply with cited Cal Poly URLs. Append this signature block:

```
Let me know if you have any questions or concerns. Thank you!

Best,
Ryan
```

Citations: Ensure inline bracketed markers map to a “Sources” list. Prefer official, current pages. If you cannot find the exact year requested, say so and link the nearest official source.

**User**
Free text question or pasted email thread.

**Depth note (added to System dynamically)**

* Medium (default): “Use a **medium‑depth** web search within `*.calpoly.edu`.”
* High (toggle): “Use a **high‑depth** web search within `*.calpoly.edu` (cast a wider net, review more authoritative pages).”

---

## 9) Request Assembly (Responses API)

* `model`: `"gpt-4.1"` (fallback `"gpt-4o"`).
* `input`: array of roles: `system`, `developer`, `user`.
* `tools`: `[ { "type": "web_search" } ]` (or `web_search_preview`).
* `tool_choice`: `"auto"` or `{ "type": "web_search" }` when forced.
* `previous_response_id`: set when continuing the same session.
* If the environment supports site allowlists or depth params on `web_search`, include them (e.g., `sites: ["calpoly.edu"]`, `search_context_size: "medium" | "high"`). Otherwise rely on prompts above.

---

## 10) Response Parsing & Rendering

* The API returns an `output` array.

  * Find the `type: "message"` item → render `content[0].text`.
  * Read `content[0].annotations` for items with `type: "url_citation"` to build:

    * **Inline markers** (the model may already include bracketed references).
    * **Sources** list (`<ol>`), each as `<a target="_blank" rel="noopener">`.
* Keep `web_search_call` in console logs for debugging (records the search call).

---

## 11) Error Handling

* **Missing/invalid API key**: Inline error with a link/hint to add a valid key; show **Forget Key** option.
* **Tool/model mismatch (4xx)**: Fallback to `gpt-4o` or alternate tool name (`web_search_preview`).
* **Rate limits/network**: Exponential backoff; “Try again” button.
* **No Cal Poly results**: Ask a brief clarifying question rather than guessing.

---

## 12) UI/UX

* **Top bar**: Title, **Settings** (API key, Model select, Depth Medium/High, Force web search), a hint about key safety.
* **Chat area**: role labels, progressive rendering (if streaming).
* **Sources block**: appears under each assistant message; numbered list.
* **Email mode**: When an email thread is detected, show a **Copy reply** button.
* **A11y**: labeled controls, keyboard shortcuts, `aria-live="polite"` for generated text.

---

## 13) Security & Privacy

* **Never** hardcode or ship an API key; use **BYOK**.
* Store only the **API key** in `localStorage` (not messages).
* Provide a **Forget Key** control and a visible note about local storage.
* Consider a small proxy later if you want to share a single public deployment without BYOK.

---

## 14) Deployment (GitHub Pages)

* Repository: **`poly-advisor`**.
* If using Vite, set `base: '/poly-advisor/'`.
* Build static assets; publish `dist` to `gh-pages` branch.
* Ensure SPA fallback to `index.html` for deep links.

---

## 15) Acceptance Tests

1. **Deadline question**: “When is the add/drop deadline for Fall?”

   * Output includes absolute dates and cites the **most recent** Registrar/Catalog pages.

2. **Change to PHIL**:

   * Output provides step‑by‑step (who to contact, which forms, where to submit) with cited URLs.

3. **Email paste**:

   * Detects RJ vs. student; drafts a concise reply with citations + signature block.

---

## 16) Future Enhancements

* Optional serverless proxy to hide a shared key and centralize quotas.
* Domain presets (e.g., prioritize `catalog.calpoly.edu`, `registrar.calpoly.edu`).
* Export chat to Markdown with embedded links.
* Cost knobs (stream on/off, stricter depth caps).

---

## 17) Example Implementation — Client‑Only (SDK in Browser, BYOK)

> **index.html**

```html
<!doctype html>
<meta charset="utf-8" />
<title>Poly Advisor</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  body { font: 16px system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 0 auto; max-width: 840px; padding: 1rem; }
  .row { display: flex; gap: .5rem; align-items: center; flex-wrap: wrap; }
  .msg { margin: .75rem 0; }
  .role { font-weight: 600; margin-bottom: .25rem; }
  textarea { width: 100%; min-height: 100px; }
  .sources { margin-top: .5rem; font-size: .95rem; }
  .hint { font-size: .9rem; color: #666; }
  button { cursor: pointer; }
</style>

<h1>Poly Advisor (Client‑only)</h1>

<div class="row" role="group" aria-label="API Key">
  <input id="apiKey" placeholder="Paste your OpenAI API key" style="flex:1" aria-label="OpenAI API key" />
  <button id="saveKey">Save</button>
  <button id="forgetKey">Forget</button>
</div>
<div class="row">
  <label><input type="radio" name="depth" value="medium" checked /> Medium search</label>
  <label><input type="radio" name="depth" value="high" /> High search</label>
  <label><input type="checkbox" id="forceSearch" /> Force web search</label>
  <select id="model">
    <option value="gpt-4.1">gpt-4.1</option>
    <option value="gpt-4o">gpt-4o</option>
  </select>
</div>
<p class="hint">Your key stays in this browser. Never commit it to code.</p>

<div id="chat" aria-live="polite"></div>

<textarea id="q" placeholder="Ask a Cal Poly question, or paste an email thread…"></textarea>
<div class="row">
  <button id="ask">Ask</button>
  <button id="new">New chat</button>
  <button id="clear">Clear screen</button>
</div>

<script type="module">
  import OpenAI from "https://cdn.jsdelivr.net/npm/openai@4.58.3/dist/openai.min.js";

  const els = {
    apiKey: document.getElementById('apiKey'),
    saveKey: document.getElementById('saveKey'),
    forgetKey: document.getElementById('forgetKey'),
    forceSearch: document.getElementById('forceSearch'),
    depthRadios: document.querySelectorAll('input[name="depth"]'),
    model: document.getElementById('model'),
    chat: document.getElementById('chat'),
    q: document.getElementById('q'),
    ask: document.getElementById('ask'),
    clear: document.getElementById('clear'),
    newChat: document.getElementById('new'),
  };

  // BYOK storage
  els.apiKey.value = localStorage.getItem('openai_key') || '';
  els.saveKey.onclick = () => localStorage.setItem('openai_key', els.apiKey.value.trim());
  els.forgetKey.onclick = () => { localStorage.removeItem('openai_key'); els.apiKey.value=''; alert('Key removed'); };

  const client = () => {
    const apiKey = localStorage.getItem('openai_key');
    if (!apiKey) throw new Error("Add your API key first.");
    return new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
  };

  let previousResponseId = null;

  function render(role, html) {
    const d = document.createElement('div');
    d.className = 'msg';
    d.innerHTML = `<div class="role">${role}</div><div>${html}</div>`;
    els.chat.appendChild(d);
    d.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }

  function isEmailThread(text) {
    return /^(from|subject|date|to):/im.test(text) || /On .* wrote:/i.test(text);
  }

  function renderAnswer(messageItem) {
    const textObj = messageItem.content.find(c => c.type === 'output_text');
    const text = textObj?.text || '';
    const annotations = textObj?.annotations?.filter(a => a.type === 'url_citation') || [];

    render('Assistant', text);

    if (annotations.length) {
      const list = annotations.map((a, i) =>
        `<li>[${i+1}] <a href="${a.url}" target="_blank" rel="noopener">${a.title || a.url}</a></li>`
      ).join('');
      const d = document.createElement('div');
      d.className = 'sources';
      d.innerHTML = `<strong>Sources</strong><ol>${list}</ol>`;
      els.chat.appendChild(d);
    }
  }

  function depthSetting() {
    const choice = Array.from(els.depthRadios).find(r => r.checked)?.value || 'medium';
    return choice; // "medium" | "high"
  }

  function systemDepthText() {
    return depthSetting() === 'high'
      ? "Use a high-depth web search within *.calpoly.edu (cast a wider net, review more authoritative pages)."
      : "Use a medium-depth web search within *.calpoly.edu.";
  }

  async function ask() {
    const query = els.q.value.trim();
    if (!query) return;

    render('You', query);
    els.q.value = '';

    const model = els.model.value || "gpt-4.1";
    const tool = { type: "web_search" }; // or "web_search_preview"
    const toolChoice = els.forceSearch.checked ? { type: "web_search" } : "auto";

    const system = [
      { type: "input_text", text:
        "You are a Cal Poly advisor assistant. Restrict yourself to results from *.calpoly.edu. " +
        systemDepthText() + " " +
        "Prefer the most recent official policy, catalog, Registrar, and advising pages. " +
        "Give clear step-by-step instructions when forms/approvals are involved. " +
        "If the exact year is unclear, cite the most recent year you can find and label it; " +
        "if the specific year is not available, link the closest official source. " +
        "Always include inline citations and a Sources list with titles and URLs. " +
        "Use absolute dates (e.g., July 28, 2025). Ask a brief clarifying question if necessary."
      }
    ];

    let userContent = query;

    if (isEmailThread(query)) {
      userContent =
        "The following is an email thread. Infer roles (advisor = RJ, Philosophy; student = the other party). " +
        "Draft a concise reply with cited Cal Poly URLs and append this signature block:\n\n" +
        "Let me know if you have any questions or concerns. Thank you!\n\nBest,\nRyan\n\n" +
        "Email thread:\n\n" + query;
    }

    const dev = [
      { type: "input_text", text:
        "Identity: Advisor initials RJ (PHIL). Assume student major PHIL unless otherwise stated. " +
        "Always produce inline citations and a Sources list with titles and URLs. Links must open in a new tab."
      }
    ];

    const resp = await client().responses.create({
      model,
      input: [
        { role: "system", content: system },
        { role: "developer", content: dev },
        { role: "user", content: [ { type: "input_text", text: userContent } ] },
      ],
      tools: [ tool ],
      tool_choice: toolChoice,
      previous_response_id: previousResponseId || undefined,
      // If your environment supports tool options like allowed sites or context size,
      // add them to the tool object. Otherwise, rely on the system instructions above.
    });

    previousResponseId = resp.id;

    const msg = (resp.output || []).find(o => o.type === "message");
    if (msg) renderAnswer(msg);
  }

  els.ask.onclick = ask;
  els.q.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); }
  });
  els.clear.onclick = () => { els.chat.innerHTML = ''; };
  els.newChat.onclick = () => { previousResponseId = null; render('System', 'Started a new chat.'); };
</script>
```

---

## 18) Minimal `fetch` Variant (no SDK)

```js
// core.js
export async function askOpenAI({ apiKey, prompt, previousResponseId, forceSearch, highDepth, model = "gpt-4.1" }) {
  const depthText = highDepth
    ? "Use a high-depth web search within *.calpoly.edu."
    : "Use a medium-depth web search within *.calpoly.edu.";

  const body = {
    model,
    input: [
      { role: "system", content: [
        { type: "input_text", text:
          "You are a Cal Poly advisor assistant. Restrict yourself to results from *.calpoly.edu. " +
          depthText + " Prefer the most recent official policy, catalog, Registrar, and advising pages. " +
          "Give step-by-step instructions when forms/approvals are involved. " +
          "If the exact year is unclear, cite the most recent year and label it; " +
          "if unavailable, link the closest official source. " +
          "Always include inline citations and a Sources list with titles and URLs. " +
          "Use absolute dates (e.g., July 28, 2025). Ask a brief clarifying question if necessary."
        }
      ]},
      { role: "developer", content: [
        { type: "input_text", text:
          "Identity: Advisor initials RJ (PHIL). Assume student major PHIL unless otherwise stated. " +
          "Always produce inline citations and a Sources list with titles and URLs. Links must open in a new tab."
        }
      ]},
      { role: "user", content: [{ type: "input_text", text: prompt }] }
    ],
    tools: [ { type: "web_search" } ], // or web_search_preview
    tool_choice: forceSearch ? { type: "web_search" } : "auto",
    previous_response_id: previousResponseId || undefined
  };

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
```

---

## 19) Handoff Checklist

* [ ] Implement UI per **index.html** example (or adapt to your framework).
* [ ] BYOK key entry + **Forget Key**; do **not** hardcode keys.
* [ ] Responses API wired with **web\_search** tool; `tool_choice` toggle; model select.
* [ ] Domain restriction via tool (if available) or prompts.
* [ ] Parse `message.content[0].text` and `url_citation` annotations to render inline citations + Sources.
* [ ] Freshness rule and absolute dates enforced in prompts.
* [ ] Email‑thread detection and signature block insertion.
* [ ] GH Pages deploy with Vite `base: '/poly-advisor/'` (if using Vite).
* [ ] Manual tests for deadlines, PHIL major change, and email paste.
