export async function fetchGithubTrending(request) {
  const html = await (await request("https://github.com/trending?since=daily")).text();
  const rows = [...html.matchAll(/<article class="Box-row">([\s\S]*?)<\/article>/g)].slice(0, 10);
  if (rows.length < 10) throw new Error("GitHub Trending returned fewer than 10 projects");

  const projects = rows.map((match, index) => {
    const row = match[1];
    const repository = row.match(/<h2[^>]*>[\s\S]*?href="\/([^"?#]+\/[^"?#]+)"/)?.[1];
    if (!repository) throw new Error("Unable to parse a GitHub Trending repository");
    const starsText = textFrom(row.match(/href="\/[^"]+\/stargazers"[^>]*>([\s\S]*?)<\/a>/)?.[1]);
    if (!/^\d[\d,]*$/.test(starsText)) throw new Error(`Unable to parse total star count for ${repository}`);
    const stars = Number(starsText.replace(/,/g, ""));
    return {
      key: `github-${index}`,
      source: "github",
      title: repository,
      url: `https://github.com/${repository}`,
      language: textFrom(row.match(/itemprop="programmingLanguage">([\s\S]*?)<\//)?.[1]),
      context: textFrom(row.match(/class="col-9 color-fg-muted my-1 pr-4">([\s\S]*?)<\//)?.[1]),
      stars,
    };
  });
  return projects;
}

function textFrom(value = "") {
  return value.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}
