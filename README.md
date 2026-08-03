# The Daily Stack

[English](README.en.md)

每天汇总 GitHub Trending、Hacker News、Product Hunt、Hugging Face Papers、OpenRouter Rankings 与英文科技播客单集的静态日报。

## 部署与自动更新

流程：Cloudflare Worker Cron 每天北京时间 10:00 触发 GitHub Actions；Actions 抓取六个来源的 Top 10 并提交 `index.html`；Vercel 监听 `main` 的新提交并自动部署。GitHub Actions 不再使用可能延迟较大的内置 `schedule`。

英文科技播客先按 Apple Podcasts 美国区 Technology 热门节目排序，再展示各节目的最新单集、发布日期与时长。

Hugging Face 当天论文流尚未就绪时，任务会自动回退到最新可用的 Daily Papers，不会中断整份日报更新。

Product Hunt 当天发布不足 10 项时，任务会回退到最近一个完整的日榜。

首次部署：

1. 在 GitHub 仓库 `Settings > Secrets and variables > Actions` 添加 `PRODUCT_HUNT_TOKEN`（必需，Product Hunt API Access Token）。
2. 可选添加 `OPENROUTER_API_KEY`。配置后会为每条内容生成中文简介；未配置或摘要无效时展示原标题。可在 `Settings > Secrets and variables > Actions > Variables` 添加 `OPENROUTER_MODEL` 指定模型，默认使用 `openrouter/free`。
3. 在 GitHub `Settings > Developer settings > Personal access tokens > Fine-grained tokens` 创建 Token，仅授权 `abnerzhao/daily-tech-stack`，Repository permissions 设置 `Actions: Read and write`。
4. 登录并部署 Cloudflare Worker，然后将 Token 保存为 Worker Secret：

```bash
npx wrangler@latest login
npm run worker:deploy
npx wrangler@latest secret put GITHUB_ACTIONS_TOKEN
```

5. Worker 的 Cron 为 `0 2 * * *`。Cloudflare Cron 使用 UTC，因此对应北京时间每天 10:00。
6. 在 Vercel 导入 `abnerzhao/daily-tech-stack`，Framework Preset 选 `Other`，Production Branch 设为 `main`，其余保持默认后部署。
7. 在 GitHub 的 `Actions > Update daily issue` 中点击 `Run workflow`，仍可手动运行；可选填写 `date`（`YYYY-MM-DD`）重跑指定日期，留空则使用当天。

本地测试 Worker Cron：

```bash
# 先在不会提交的 .dev.vars 中配置 GITHUB_ACTIONS_TOKEN
npm run worker:dev
curl "http://localhost:8787/__scheduled?cron=0+2+*+*+*"
```

每次 Actions 提交后，Vercel 会自动创建生产部署。Vercel 项目不需要额外的环境变量。`GITHUB_ACTIONS_TOKEN` 只配置在 Cloudflare，不要加入仓库或 Vercel。

本地调试或手动更新：

```bash
cd /path/to/daily-tech-stack
npm run daily:update
git add index.html && git commit -m "更新：$(date +%F) 技术热榜" && git push
```
