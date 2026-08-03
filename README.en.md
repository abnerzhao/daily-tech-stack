# The Daily Stack

[中文](README.md)

A static daily briefing that collects the top 10 items from GitHub Trending, Hacker News, Product Hunt, Hugging Face Papers, OpenRouter Rankings, and English technology podcast episodes.

## Deployment and scheduled updates

Flow: a Cloudflare Worker Cron Trigger invokes GitHub Actions every day at 10:00 Asia/Shanghai. Actions fetches six top-10 lists, updates `index.html`, and commits the result. Vercel watches new commits on `main` and deploys them automatically. The workflow no longer relies on GitHub Actions' delay-prone built-in `schedule` event.

The English technology section ranks shows using the Apple Podcasts U.S. Technology chart, then displays each ranked show's latest episode, release date, and duration.

If Hugging Face has not published a feed for the current day yet, the task automatically falls back to the latest available Daily Papers instead of failing the entire update.

If Product Hunt has fewer than 10 launches for the current day, the task falls back to the most recent complete daily ranking.

Initial setup:

1. In the GitHub repository, add `PRODUCT_HUNT_TOKEN` under `Settings > Secrets and variables > Actions`. This is required and should contain a Product Hunt API Access Token.
2. Optionally add `OPENROUTER_API_KEY` to generate a Chinese description for every item. Without it, or when a summary is invalid, the site displays the original title. You can add `OPENROUTER_MODEL` under `Settings > Secrets and variables > Actions > Variables` to select a model; the default is `openrouter/free`.
3. In GitHub, create a fine-grained personal access token under `Settings > Developer settings > Personal access tokens > Fine-grained tokens`. Limit it to `abnerzhao/daily-tech-stack` and grant `Actions: Read and write` repository permission.
4. Log in, deploy the Cloudflare Worker, and store the token as a Worker secret:

```bash
npx wrangler@latest login
npm run worker:deploy
npx wrangler@latest secret put GITHUB_ACTIONS_TOKEN
```

5. The Worker cron is `0 2 * * *`. Cloudflare evaluates cron expressions in UTC, so this runs every day at 10:00 Asia/Shanghai.
6. Import `abnerzhao/daily-tech-stack` into Vercel. Choose `Other` as the Framework Preset, set `main` as the Production Branch, and deploy with the remaining defaults.
7. In GitHub, open `Actions > Update daily issue` and select `Run workflow` for a manual run. Optionally provide a `date` in `YYYY-MM-DD` format to rerun a specific issue; leave it blank for today.

Test the Worker Cron locally:

```bash
# First set GITHUB_ACTIONS_TOKEN in the untracked .dev.vars file
npm run worker:dev
curl "http://localhost:8787/__scheduled?cron=0+2+*+*+*"
```

Every commit made by the workflow triggers a Vercel production deployment. No environment variables are required in Vercel. Configure `GITHUB_ACTIONS_TOKEN` only in Cloudflare, never in the repository or Vercel.

For local development or a manual update:

```bash
cd /path/to/daily-tech-stack
npm run daily:update
git add index.html && git commit -m "Update: $(date +%F) tech hotspots" && git push
```
