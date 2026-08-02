import assert from "node:assert/strict";
import test from "node:test";
import { parseDescriptions } from "./description-parser.mjs";

const keys = ["github-0", "hn-0"];

test("parses fenced JSON with trailing prose", () => {
  const content = "说明如下：\n```json\n{\"items\":[{\"key\":\"github-0\",\"description\":\"开源项目，值得关注。\"}]}\n```\n完毕";
  assert.deepEqual(parseDescriptions(content, keys), new Map([["github-0", "开源项目，值得关注。"]]));
});

test("parses embedded JSON before a stray code fence", () => {
  const content = "{\"items\":[{\"key\":\"hn-0\",\"description\":\"技术讨论热度高。\"}]}\n```";
  assert.deepEqual(parseDescriptions(content, keys), new Map([["hn-0", "技术讨论热度高。"]]));
});

test("parses line-based fallback output", () => {
  const content = "github-0\t开源项目，值得关注。\nhn-0: 技术讨论热度高。";
  assert.deepEqual(parseDescriptions(content, keys), new Map([
    ["github-0", "开源项目，值得关注。"],
    ["hn-0", "技术讨论热度高。"],
  ]));
});

test("parses Markdown list, table, and split-line output", () => {
  const content = "1. **github-0**: **开源项目，值得关注。**\n| hn-0 | 技术讨论热度高。 |";
  assert.deepEqual(parseDescriptions(content, keys), new Map([
    ["github-0", "开源项目，值得关注。"],
    ["hn-0", "技术讨论热度高。"],
  ]));
});

test("parses a key followed by its description on the next line", () => {
  const content = "`github-0`\n开源项目，值得关注。";
  assert.deepEqual(parseDescriptions(content, keys), new Map([["github-0", "开源项目，值得关注。"]]));
});

test("accepts a plain single-item response", () => {
  assert.deepEqual(
    parseDescriptions("该项目通过低内存运行大模型，适合关注端侧推理。", ["hn-0"]),
    new Map([["hn-0", "该项目通过低内存运行大模型，适合关注端侧推理。"]]),
  );
});

test("removes duplicated protocol keys and TAB markers", () => {
  const content = JSON.stringify({ items: [
    { key: "github-0", description: "github-0\\t开源项目，值得关注。" },
    { key: "hn-0", description: "hn-0<TAB>技术讨论热度高。" },
  ] });
  assert.deepEqual(parseDescriptions(content, keys), new Map([
    ["github-0", "开源项目，值得关注。"],
    ["hn-0", "技术讨论热度高。"],
  ]));
});

test("rejects safety metadata as a description", () => {
  assert.deepEqual(parseDescriptions("User Safety: safe", ["hn-0"]), new Map());
  assert.deepEqual(parseDescriptions("hn-0<TAB>User Safety: safe", ["hn-0"]), new Map());
});

test("keeps legitimate names that resemble protocol keys", () => {
  assert.deepEqual(
    parseDescriptions("GPT-5：适合复杂推理任务。", ["openrouter-0"]),
    new Map([["openrouter-0", "GPT-5：适合复杂推理任务。"]]),
  );
});
