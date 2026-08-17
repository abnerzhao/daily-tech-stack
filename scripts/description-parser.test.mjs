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

test("removes a duplicated TAB marker before the description", () => {
  assert.deepEqual(
    parseDescriptions("github-0<TAB>TAB提供图表设计库，帮助快速创建可视化图形。", ["github-0"]),
    new Map([["github-0", "提供图表设计库，帮助快速创建可视化图形。"]]),
  );
});

test("normalizes podcast wording accidentally used for a paper", () => {
  assert.deepEqual(
    parseDescriptions("hf-0<TAB>节目聚焦小参数模型的上下文学习能力。", ["hf-0"]),
    new Map([["hf-0", "论文聚焦小参数模型的上下文学习能力。"]]),
  );
  assert.deepEqual(
    parseDescriptions("tech-podcast-0<TAB>节目聚焦人工智能行业动态。", ["tech-podcast-0"]),
    new Map([["tech-podcast-0", "节目聚焦人工智能行业动态。"]]),
  );
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

test("rejects summaries without Chinese text", () => {
  assert.deepEqual(parseDescriptions("Hard Fork explores the latest tech news.", ["tech-podcast-0"]), new Map());
});

test("rejects leaked reasoning and character-count analysis", () => {
  const content = `Title "Kimi K3: Open Frontier Intelligence". Context describes model details. Not a guest dialogue.
So description: summarize the model. Must be ≤45 Chinese characters. Let's craft: "介绍Kimi K3模型。"
Count characters: 介(1)绍(2)K(3)i(4)m(5)i(6)`;
  assert.deepEqual(parseDescriptions(content, ["hf-0"]), new Map());
  assert.deepEqual(parseDescriptions(`hf-0<TAB>${content}`, ["hf-0"]), new Map());
});

test("rejects summaries beyond the source length limit", () => {
  const tooLong = "这是一段明显超过规定长度的中文摘要，它包含过多的背景、方法、结果、结论以及不必要的延伸解释内容，继续补充无关细节。";
  assert.deepEqual(parseDescriptions(tooLong, ["hf-0"]), new Map());
});
