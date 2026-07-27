#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const outputPath = resolve(root, "index.html");
const requestedDate = getOption("--date") ?? process.env.ISSUE_DATE;
const date = requestedDate || new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

if (process.argv.includes("--help")) {
  console.log("Usage: node scripts/update-daily.mjs [--date YYYY-MM-DD]");
  process.exit(0);
}

const [github, hackerNews, productHunt, huggingFace, openRouter] = await Promise.all([
  fetchGithubTrending(),
  fetchHackerNews(),
  fetchProductHunt(),
  fetchHuggingFacePapers(),
  fetchOpenRouterRankings(),
]);

const descriptions = await describeInChinese([...github, ...hackerNews, ...productHunt, ...huggingFace, ...openRouter]);
for (const item of [...github, ...hackerNews, ...productHunt, ...huggingFace, ...openRouter]) {
  item.description = descriptions.get(item.key) ?? fallbackDescription(item);
}

const html = await readFile(outputPath, "utf8");
const issue = renderIssue({ date, github, hackerNews, productHunt, huggingFace, openRouter });
const updated = replaceIssues(html, issue, date);
await writeFile(outputPath, updated);
console.log(`Updated ${date}: 50 signals`);

function getOption(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "user-agent": "daily-tech-stack/1.0 (+https://github.com/abnerzhao/daily-tech-stack)",
      ...options.headers,
    },
  });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response;
}

async function fetchGithubTrending() {
  const html = await (await request("https://github.com/trending?since=daily")).text();
  const rows = [...html.matchAll(/<article class="Box-row">([\s\S]*?)<\/article>/g)].slice(0, 10);
  if (rows.length < 10) throw new Error("GitHub Trending returned fewer than 10 projects");

  return rows.map((match, index) => {
    const row = match[1];
    const repository = row.match(/href="\/([^"?#]+\/[^"?#]+)"/)?.[1];
    if (!repository) throw new Error("Unable to parse a GitHub Trending repository");
    return {
      key: `github-${index}`,
      source: "github",
      title: repository,
      url: `https://github.com/${repository}`,
      language: textFrom(row.match(/itemprop="programmingLanguage">([\s\S]*?)<\//)?.[1]),
      stars: row.match(/([\d,]+)\s+stars today/)?.[1] ?? "0",
      context: textFrom(row.match(/class="col-9 color-fg-muted my-1 pr-4">([\s\S]*?)<\//)?.[1]),
    };
  });
}

async function fetchHackerNews() {
  const ids = await (await request("https://hacker-news.firebaseio.com/v0/topstories.json")).json();
  const stories = await Promise.all(ids.slice(0, 30).map(async (id) => (
    await (await request(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)).json()
  )));
  const top = stories.filter((story) => story?.type === "story" && story.title).slice(0, 10);
  if (top.length < 10) throw new Error("Hacker News returned fewer than 10 stories");
  return top.map((story, index) => ({
    key: `hn-${index}`,
    source: "hn",
    title: story.title,
    url: story.url ?? `https://news.ycombinator.com/item?id=${story.id}`,
    points: story.score ?? 0,
    comments: story.descendants ?? 0,
    context: story.url ?? "Hacker News discussion",
  }));
}

async function fetchProductHunt() {
  if (!process.env.PRODUCT_HUNT_TOKEN) {
    throw new Error("PRODUCT_HUNT_TOKEN is required to fetch Product Hunt. Add it to GitHub Actions secrets.");
  }
  const dayStart = new Date(`${date}T00:00:00+08:00`).toISOString();
  const query = `query { posts(first: 10, order: VOTES, postedAfter: "${dayStart}") { edges { node { name tagline votesCount slug website } } } }`;
  const response = await request("https://api.producthunt.com/v2/api/graphql", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.PRODUCT_HUNT_TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  const result = await response.json();
  if (result.errors?.length) throw new Error(`Product Hunt API: ${result.errors[0].message}`);
  const posts = result.data?.posts?.edges?.map((edge) => edge.node) ?? [];
  if (posts.length < 10) throw new Error("Product Hunt returned fewer than 10 products");
  return posts.slice(0, 10).map((post, index) => ({
    key: `ph-${index}`,
    source: "ph",
    title: post.name,
    url: `https://www.producthunt.com/products/${post.slug}`,
    votes: post.votesCount ?? 0,
    context: post.tagline ?? post.website ?? "Product Hunt launch",
  }));
}

async function fetchHuggingFacePapers() {
  const latestUrl = "https://huggingface.co/api/daily_papers?p=0&limit=10&sort=trending";
  const datedUrl = `${latestUrl}&date=${date}`;
  let entries;
  try {
    entries = await (await request(datedUrl)).json();
  } catch {
    console.warn(`Hugging Face has no daily feed for ${date}; using the latest available papers.`);
    entries = await (await request(latestUrl)).json();
  }
  if (!Array.isArray(entries) || entries.length < 10) {
    throw new Error("Hugging Face Daily Papers returned fewer than 10 papers");
  }
  return entries.slice(0, 10).map((entry, index) => {
    const paper = entry.paper ?? entry;
    if (!paper.id || !paper.title) throw new Error("Unable to parse a Hugging Face paper");
    return {
      key: `hf-${index}`,
      source: "hf",
      title: paper.title,
      url: `https://huggingface.co/papers/${paper.id}`,
      upvotes: paper.upvotes ?? 0,
      comments: entry.numComments ?? paper.numComments ?? 0,
      context: paper.ai_summary ?? paper.summary ?? "Hugging Face Daily Paper",
    };
  });
}

async function fetchOpenRouterRankings() {
  const result = await (await request("https://openrouter.ai/api/v1/models?sort=most-popular")).json();
  const models = result.data ?? [];
  if (models.length < 10) throw new Error("OpenRouter Rankings returned fewer than 10 models");
  return models.slice(0, 10).map((model, index) => ({
    key: `openrouter-${index}`,
    source: "openrouter",
    title: model.name,
    url: `https://openrouter.ai/${model.id}`,
    contextLength: model.context_length ?? 0,
    context: model.description ?? "OpenRouter weekly model usage ranking",
  }));
}

async function describeInChinese(items) {
  if (!process.env.OPENROUTER_API_KEY) return new Map();
  const payload = items.map(({ key, source, title, context }) => ({ key, source, title, context }));
  const response = await request("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "content-type": "application/json",
      "http-referer": "https://daily-tech-stack.vercel.app",
      "x-openrouter-title": "The Daily Stack",
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL ?? "openrouter/free",
      temperature: 0.2,
      messages: [
        { role: "system", content: "你是技术编辑。为每条内容写一句简洁中文简介，包含内容是什么及为什么值得看；每条不超过45个中文字符。只返回 JSON：{\\\"items\\\":[{\\\"key\\\":string,\\\"description\\\":string}]}。" },
        { role: "user", content: JSON.stringify(payload) },
      ],
    }),
  });
  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenRouter returned no descriptions");
  const parsed = JSON.parse(String(content).replace(/^```json\s*|\s*```$/g, "").trim());
  return new Map((parsed.items ?? []).map((item) => [item.key, item.description]));
}

function fallbackDescription(item) {
  if (item.source === "openrouter") return "近一周 Token 使用量靠前的模型，适合观察真实采用趋势。";
  const label = { github: "开源项目", hn: "技术文章", ph: "新产品", hf: "AI 论文" }[item.source];
  return `今日热门${label}，建议查看原始页面了解实现与讨论。`;
}

function renderIssue({ date, github, hackerNews, productHunt, huggingFace, openRouter }) {
  const label = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "Asia/Shanghai" }).format(new Date(`${date}T12:00:00+08:00`));
  const sources = [
    ["github", "github.svg", "GitHub Trending", "https://github.com/trending", github],
    ["hacker-news", "hacker-news.svg", "Hacker News", "https://news.ycombinator.com/", hackerNews],
    ["product-hunt", "product-hunt.svg", "Product Hunt", "https://www.producthunt.com/", productHunt],
    ["hugging-face-papers", "hugging-face.svg", "Hugging Face Papers", "https://huggingface.co/papers", huggingFace],
    ["openrouter-rankings", "openrouter.svg", "OpenRouter Rankings", "https://openrouter.ai/rankings/", openRouter],
  ];
  return `<!-- ISSUE_START:${date} -->\n        <article class="card active" data-order="0" data-day="${date}">\n          <div class="card-shell">\n            <header class="card-head">Today · ${label}</header>\n            <div class="document">\n              <div class="document-layout">\n                <aside class="contents" aria-label="Contents">\n                  <p class="contents-title">Contents</p>\n                  ${sources.map(([id, icon, title]) => toc(id, date, icon, title)).join("\n                  ")}\n                </aside>\n                <div class="sections">\n                  ${sources.map(([id, icon, title, sourceUrl, items]) => renderSection(id, date, icon, title, sourceUrl, items)).join("\n                  ")}\n                </div>\n              </div>\n            </div>\n          </div>\n        </article>\n        <!-- ISSUE_END:${date} -->`;
}

function toc(id, date, icon, title) {
  return `<a href="#${id}-${date}"><img class="source-icon" src="assets/${icon}" alt="" aria-hidden="true" />${title}</a>`;
}

function renderSection(id, date, icon, title, sourceUrl, items) {
  return `<section class="section" id="${id}-${date}">\n                    <h2><a href="${sourceUrl}" target="_blank" rel="noreferrer"><img class="source-icon" src="assets/${icon}" alt="" aria-hidden="true" />${title}</a></h2>\n${items.map((item, index) => renderItem(item, index + 1)).join("\n")}\n                  </section>`;
}

function renderItem(item, rank) {
  const meta = item.source === "github"
    ? `<span>${languageIcon(item.language)}${escape(item.language || "Unknown")}</span><span><i class="star" aria-hidden="true">★</i> ${escape(item.stars)}</span>`
    : item.source === "hn" || item.source === "hf"
      ? `<span aria-label="${item.source === "hf" ? item.upvotes : item.points} ${item.source === "hf" ? "upvotes" : "points"}"><img class="meta-icon" src="assets/icon-points.svg" alt="" aria-hidden="true" />${item.source === "hf" ? item.upvotes : item.points}</span><span aria-label="${item.comments} comments"><img class="meta-icon" src="assets/icon-comments.svg" alt="" aria-hidden="true" />${item.comments}</span>`
      : item.source === "openrouter"
        ? `<span aria-label="${formatContext(item.contextLength)} context"><img class="meta-icon" src="assets/icon-code.svg" alt="" aria-hidden="true" />${formatContext(item.contextLength)} context</span><span>weekly usage</span>`
        : `<span aria-label="${item.votes} votes"><img class="meta-icon" src="assets/icon-points.svg" alt="" aria-hidden="true" />${item.votes}</span>`;
  return `                    <article class="item">\n                      <a class="item-title" href="${escape(item.url)}" target="_blank" rel="noreferrer"><span class="rank">#${String(rank).padStart(2, "0")}</span><span>${escape(item.title)}</span></a>\n                      <div class="meta">${meta}</div>\n                      <p>${escape(item.description)}</p>\n                    </article>`;
}

function languageIcon(language = "") {
  const icons = {
    JavaScript: "javascript/javascript-original.svg", TypeScript: "typescript/typescript-original.svg",
    Python: "python/python-original.svg", Java: "java/java-original.svg", Go: "go/go-original-wordmark.svg",
    Rust: "rust/rust-original.svg", Swift: "swift/swift-original.svg", Ruby: "ruby/ruby-original.svg",
    C: "c/c-original.svg", "C++": "cplusplus/cplusplus-original.svg", Kotlin: "kotlin/kotlin-original.svg",
    Shell: "bash/bash-original.svg", Jupyter: "jupyter/jupyter-original.svg",
  };
  const icon = icons[language];
  return icon ? `<img class="language-icon" src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/${icon}" alt="" aria-hidden="true" />` : "";
}

function formatContext(value) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value % 1_000_000 ? 1 : 0)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}

function replaceIssues(html, issue, currentDate) {
  const start = "<!-- ISSUES_START -->";
  const end = "<!-- ISSUES_END -->";
  const startIndex = html.indexOf(start);
  const endIndex = html.indexOf(end);
  if (startIndex === -1 || endIndex === -1) throw new Error("Issue markers are missing from index.html");
  const issueArea = html.slice(startIndex + start.length, endIndex);
  const blocks = [...issueArea.matchAll(/<!-- ISSUE_START:([^ ]+) -->([\s\S]*?)<!-- ISSUE_END:\1 -->/g)]
    .filter((match) => match[1] !== currentDate)
    .map((match, index) => match[0]
      .replace('class="card active"', 'class="card"')
      .replace(/data-order="\d+"/, `data-order="${index + 1}"`)
      .replace("Today · ", ""));
  return `${html.slice(0, startIndex + start.length)}\n        ${issue}\n\n        ${blocks.join("\n\n        ")}\n        ${html.slice(endIndex)}`;
}

function textFrom(value = "") {
  return value.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

function escape(value = "") {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}
