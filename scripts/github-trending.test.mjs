import assert from "node:assert/strict";
import test from "node:test";
import { fetchGithubTrending } from "./github-trending.mjs";

function trendingHtml(repositories) {
  return repositories.map(({ name, stars }, index) => `
    <article class="Box-row">
      <h2><a href="/${name}">${name}</a></h2>
      <p class="col-9 color-fg-muted my-1 pr-4">Repository ${index}</p>
      <span itemprop="programmingLanguage">JavaScript</span>
      <a href="/${name}/stargazers"><svg></svg>${stars.toLocaleString("en-US")}</a>
      <span>${index + 100} stars today</span>
    </article>`).join("");
}

test("uses total stars from Trending without calling the repository API", async () => {
  const starCounts = [4202, 141893, 61151, 85795, 76566, 13179, 65278, 89398, 17968, 165155];
  const html = trendingHtml(starCounts.map((stars, index) => ({ name: `owner/repo-${index}`, stars })));
  let apiCalls = 0;
  const request = async (url) => {
    if (url.includes("/trending")) return { text: async () => html };
    apiCalls += 1;
    const error = new TypeError("fetch failed");
    error.cause = Object.assign(new Error("self-signed certificate"), { code: "DEPTH_ZERO_SELF_SIGNED_CERT" });
    throw error;
  };

  const projects = await fetchGithubTrending(request);

  assert.equal(apiCalls, 0);
  assert.deepEqual(projects.map((project) => project.stars), starCounts);
});

test("fills a short global daily feed from language daily feeds", async () => {
  const global = Array.from({ length: 7 }, (_, index) => ({ name: `global/repo-${index}`, stars: 1000 + index }));
  const supplemental = [
    global[5],
    global[6],
    { name: "extra/repo-7", stars: 2007 },
    { name: "extra/repo-8", stars: 2008 },
    { name: "extra/repo-9", stars: 2009 },
  ];
  const requestedUrls = [];
  const request = async (url) => {
    requestedUrls.push(url);
    return { text: async () => trendingHtml(url.includes("/typescript") ? supplemental : global) };
  };

  const projects = await fetchGithubTrending(request);

  assert.equal(projects.length, 10);
  assert.deepEqual(projects.map((project) => project.title), [
    ...global.map((project) => project.name),
    "extra/repo-7",
    "extra/repo-8",
    "extra/repo-9",
  ]);
  assert.equal(requestedUrls.length, 2);
});

test("continues with a partial list when every fallback is underfilled", async () => {
  const global = Array.from({ length: 7 }, (_, index) => ({ name: `global/repo-${index}`, stars: 1000 + index }));
  const warnings = [];
  const projects = await fetchGithubTrending(
    async () => ({ text: async () => trendingHtml(global) }),
    (message) => warnings.push(message),
  );

  assert.equal(projects.length, 7);
  assert.match(warnings.at(-1), /continuing with a partial list/);
});

test("skips an unavailable supplemental source", async () => {
  const global = Array.from({ length: 7 }, (_, index) => ({ name: `global/repo-${index}`, stars: 1000 + index }));
  const supplemental = Array.from({ length: 3 }, (_, index) => ({ name: `extra/repo-${index}`, stars: 2000 + index }));
  const request = async (url) => {
    if (url.includes("/typescript")) throw new Error("temporary failure");
    return { text: async () => trendingHtml(url.includes("/python") ? supplemental : global) };
  };

  const projects = await fetchGithubTrending(request, () => {});

  assert.equal(projects.length, 10);
});
