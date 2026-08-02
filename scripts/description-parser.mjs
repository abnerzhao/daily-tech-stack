export function parseDescriptions(content, expectedKeys) {
  const expected = new Set(expectedKeys);
  const json = parseJsonDescriptions(String(content), expected);
  if (json.size) return json;

  const lines = new Map();
  let pendingKey = "";
  for (const rawLine of String(content).split(/\r?\n/)) {
    const line = rawLine.trim();
    const match = line.match(/^(?:[-*]\s*)?(?:\d+[.)]\s*)?(?:\|\s*)?(?:["'`]|\*{1,2})?([a-z][a-z-]*-\d+)(?:["'`]|\*{1,2})?\s*(?:\\t|<TAB>|\t+|\|\s*|[:：]\s*|[-—]\s+)(.+?)(?:\s*\|)?$/i);
    if (match && expected.has(match[1])) {
      const description = cleanDescription(match[2]);
      if (description) lines.set(match[1], description);
      pendingKey = "";
      continue;
    }
    const keyOnly = line.match(/^(?:[-*]\s*)?(?:\d+[.)]\s*)?(?:["'`]|\*{1,2})?([a-z][a-z-]*-\d+)(?:["'`]|\*{1,2})?$/i)?.[1];
    if (keyOnly && expected.has(keyOnly)) {
      pendingKey = keyOnly;
      continue;
    }
    if (!pendingKey || !line) continue;
    const description = cleanDescription(line);
    if (description) lines.set(pendingKey, description);
    pendingKey = "";
  }
  if (lines.size || expected.size !== 1) return lines;

  const plainText = cleanDescription(String(content).replace(/```(?:json)?\s*|```/gi, "").trim());
  if (plainText && !/^[{[]/.test(plainText)) lines.set([...expected][0], plainText);
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
  if (typeof value !== "string") return "";
  let description = value.trim().replace(/^(?:['\"`]+|\*+)|(?:['\"`]+|\*+)$/g, "");
  const protocolPrefix = /^(?:(?:github|hn|ph|hf|openrouter|tech-podcast)-\d+)\s*(?:\\t|<TAB>|\t+|[:：]|[-—]\s+)\s*/i;
  while (protocolPrefix.test(description)) description = description.replace(protocolPrefix, "");
  if (/^(?:user|assistant|content)?\s*safety\s*[:：]\s*(?:safe|unsafe)\b/i.test(description)) return "";
  if (!/[\u3400-\u9fff]/u.test(description)) return "";
  return description.trim();
}
