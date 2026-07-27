# The Daily Stack

[English](README.en.md)

每天汇总 GitHub Trending、Hacker News、Product Hunt、Hugging Face Papers 与 OpenRouter Rankings 的静态技术日报。

## 部署与自动更新

流程：GitHub Actions 每天北京时间 07:30 抓取五个来源的 Top 10 并提交 `index.html`；Vercel 监听 `main` 的新提交并自动部署。无需远程服务器、cron 或 Vercel Token。

首次部署：

1. 在 GitHub 仓库 `Settings > Secrets and variables > Actions` 添加 `PRODUCT_HUNT_TOKEN`（必需，Product Hunt API Access Token）。
2. 可选添加 `OPENROUTER_API_KEY`。配置后会为每条内容生成中文简介；未配置时使用中文兜底说明。可在 `Settings > Secrets and variables > Actions > Variables` 添加 `OPENROUTER_MODEL` 指定模型，默认使用 `openrouter/free`。
3. 在 Vercel 导入 `abnerzhao/daily-tech-stack`，Framework Preset 选 `Other`，Production Branch 设为 `main`，其余保持默认后部署。
4. 在 GitHub 的 `Actions > Update daily issue` 中点击 `Run workflow`，可立即生成首份自动日报；之后会按计划每日更新。

每次 Actions 提交后，Vercel 会自动创建生产部署。Vercel 项目不需要额外的环境变量。

本地调试或手动更新：

```bash
cd /path/to/daily-tech-stack
npm run daily:update
git add index.html && git commit -m "更新：$(date +%F) 技术热榜" && git push
```
