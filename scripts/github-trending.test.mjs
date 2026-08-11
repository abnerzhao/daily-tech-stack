import assert from "node:assert/strict";
import test from "node:test";
import { fetchGithubTrending } from "./github-trending.mjs";

test("uses total stars from Trending without calling the repository API", async () => {
  const starCounts = [4202, 141893, 61151, 85795, 76566, 13179, 65278, 89398, 17968, 165155];
  const html = Array.from({ length: 10 }, (_, index) => `
    <article class="Box-row">
      <h2><a href="/owner/repo-${index}">owner / repo-${index}</a></h2>
      <p class="col-9 color-fg-muted my-1 pr-4">Repository ${index}</p>
      <span itemprop="programmingLanguage">JavaScript</span>
      <a href="/owner/repo-${index}/stargazers"><svg></svg>${starCounts[index].toLocaleString("en-US")}</a>
      <span>${index + 100} stars today</span>
    </article>`).join("");
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
