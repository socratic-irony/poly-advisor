const OPENAI_URL = "https://api.openai.com/v1/responses";
const MODEL = "gpt-5.4-mini"; // Use a model that supports web_search

// Only allow searching within Cal Poly domains. Subdomains are included automatically.
export const ALLOWED_DOMAINS = [
  "calpoly.edu"
];

/**
 * Build the Responses API body for a single chat turn.
 * `history` is an array of { role: 'user'|'assistant'|'system', content: string }.
 * We'll flatten it into a plain text transcript in `input`.
 */
function buildRequestBody(history) {
  const transcript = history
    .map(m => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");

  return {
    model: MODEL,
    input: transcript,
    tools: [
      {
        type: "web_search",
        filters: {
          // IMPORTANT: omit http/https, include only hostnames; subdomains are allowed automatically
          allowed_domains: ALLOWED_DOMAINS
        }
      }
    ],
    tool_choice: "auto" // Let the model decide when to use the tool
  };
}

/**
 * Send the request to the Responses API and return the text output.
 */
export async function completeWithDomainFilteredSearch(history) {
  const body = buildRequestBody(history);

  const resp = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    throw new Error(`OpenAI ${resp.status}: ${errText || resp.statusText}`);
  }

  const data = await resp.json();
  const textChunks = [];

  if (Array.isArray(data.output)) {
    for (const part of data.output) {
      if (part && typeof part.content === "string") textChunks.push(part.content);
      if (part && part.type === "output_text" && typeof part.text === "string") textChunks.push(part.text);
    }
  }

  if (textChunks.length === 0 && typeof data.output_text === "string") {
    textChunks.push(data.output_text);
  }

  if (textChunks.length === 0 && data.response && typeof data.response.output_text === "string") {
    textChunks.push(data.response.output_text);
  }

  return textChunks.join("\n").trim() || JSON.stringify(data, null, 2);
}
