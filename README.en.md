# The Daily Stack

[中文](README.md)

A static daily briefing that collects the top 10 items from GitHub Trending, Hacker News, Product Hunt, and Hugging Face Papers.

## Deployment and scheduled updates

Flow: GitHub Actions fetches four top-10 lists every day at 07:30 Asia/Shanghai, updates `index.html`, and commits the result. Vercel watches new commits on `main` and deploys them automatically. No remote server, cron job, or Vercel token is required.

Initial setup:

1. In the GitHub repository, add `PRODUCT_HUNT_TOKEN` under `Settings > Secrets and variables > Actions`. This is required and should contain a Product Hunt API Access Token.
2. Optionally add `OPENROUTER_API_KEY` to generate a Chinese description for every item. Without it, the site uses a generic Chinese fallback. You can add `OPENROUTER_MODEL` under `Settings > Secrets and variables > Actions > Variables` to select a model; the default is `openrouter/free`.
3. Import `abnerzhao/daily-tech-stack` into Vercel. Choose `Other` as the Framework Preset, set `main` as the Production Branch, and deploy with the remaining defaults.
4. In GitHub, open `Actions > Update daily issue` and select `Run workflow` to create the first automated issue immediately. Subsequent issues are generated on schedule.

Every commit made by the workflow triggers a Vercel production deployment. No environment variables are required in Vercel.

For local development or a manual update:

```bash
cd /path/to/daily-tech-stack
npm run daily:update
git add index.html && git commit -m "Update: $(date +%F) tech hotspots" && git push
```
