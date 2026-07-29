export function parseDescriptions(content, expectedKeys) {
  const expected = new Set(expectedKeys);
  const json = parseJsonDescriptions(String(content), expected);
  if (json.size) return json;

  const lines = new Map();
  for (const rawLine of String(content).split(/\r?\n/)) {
    const match = rawLine.trim().match(/^(?:[-*]\s*)?(?:\d+[.)]\s*)?([a-z][a-z-]*-\d+)\s*(?:\t+|[:：]\s*|[-—]\s+)(.+)$/i);
    if (!match || !expected.has(match[1])) continue;
    const description = cleanDescription(match[2]);
    if (description) lines.set(match[1], description);
  }
  return lines;
}

function parseJsonDescriptions(content, expected) {
  for (const candidate of jsonCandidates(content)) {
    try {
      const parsed = JSON.parse(candidate);
      const items = Array.isArray(parsed) ? parsed : parsed.items;
      if (!Array.isArray(items)) continue;
      const descriptions = new Map();
      for (const item of items) {
        if (!expected.has(item?.key)) continue;
        const description = cleanDescription(item.description);
        if (description) descriptions.set(item.key, description);
      }
      if (descriptions.size) return descriptions;
    } catch {
      // Try the next fenced or embedded JSON payload.
    }
  }
  return new Map();
}

function jsonCandidates(content) {
  const candidates = [...content.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map((match) => match[1].trim());
  const start = [...content].findIndex((character) => character === "{" || character === "[");
  if (start !== -1) {
    const embedded = extractBalancedJson(content, start);
    if (embedded) candidates.push(embedded);
  }
  return candidates;
}

function extractBalancedJson(text, start) {
  const opening = text[start];
  const closing = opening === "{" ? "}" : "]";
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const character = text[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = "";
      continue;
    }
    if (character === "\"" || character === "'") {
      quote = character;
      continue;
    }
    if (character === opening) depth += 1;
    if (character === closing && --depth === 0) return text.slice(start, index + 1);
  }
  return "";
}

function cleanDescription(value) {
  return typeof value === "string" ? value.trim().replace(/^['\"`]+|['\"`]+$/g, "") : "";
}
