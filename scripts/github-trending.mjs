const sources = [
  "https://github.com/trending?since=daily",
  "https://github.com/trending/typescript?since=daily",
  "https://github.com/trending/python?since=daily",
  "https://github.com/trending/javascript?since=daily",
  "https://github.com/trending/go?since=daily",
  "https://github.com/trending/rust?since=daily",
  "https://github.com/trending?since=weekly",
];

export async function fetchGithubTrending(request, warn = console.warn) {
  const projects = [];
  const seen = new Set();

  for (const source of sources) {
    try {
      const html = await (await request(source)).text();
      for (const project of parseTrendingPage(html)) {
        if (seen.has(project.title)) continue;
        seen.add(project.title);
        projects.push(project);
        if (projects.length === 10) return withKeys(projects);
      }
    } catch (error) {
      warn(`GitHub Trending source unavailable (${source}): ${error.message}`);
    }
  }

  if (!projects.length) throw new Error("GitHub Trending returned no projects from any source");
  warn(`GitHub Trending returned only ${projects.length} unique projects; continuing with a partial list.`);
  return withKeys(projects);
}

function parseTrendingPage(html) {
  const rows = [...html.matchAll(/<article class="Box-row">([\s\S]*?)<\/article>/g)];
  return rows.flatMap((match) => {
    const row = match[1];
    const repository = row.match(/<h2[^>]*>[\s\S]*?href="\/([^"?#]+\/[^"?#]+)"/)?.[1];
    const starsText = textFrom(row.match(/href="\/[^"]+\/stargazers"[^>]*>([\s\S]*?)<\/a>/)?.[1]);
    if (!repository || !/^\d[\d,]*$/.test(starsText)) return [];
    return [{
      source: "github",
      title: repository,
      url: `https://github.com/${repository}`,
      language: textFrom(row.match(/itemprop="programmingLanguage">([\s\S]*?)<\//)?.[1]),
      context: textFrom(row.match(/class="col-9 color-fg-muted my-1 pr-4">([\s\S]*?)<\//)?.[1]),
      stars: Number(starsText.replace(/,/g, "")),
    }];
  });
}

function withKeys(projects) {
  return projects.map((project, index) => ({ ...project, key: `github-${index}` }));
}

function textFrom(value = "") {
  return value.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}
