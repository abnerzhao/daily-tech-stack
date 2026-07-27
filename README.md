# The Daily Stack

每天汇总 GitHub Trending、Hacker News 与 Product Hunt 的静态技术日报。

## 自动更新

GitHub Actions 会在每天北京时间 07:30 抓取三站 Top 10、更新 `index.html` 并自动提交。Vercel 连接仓库的 `main` 分支后，会为每次新提交自动部署。首次启用前，在仓库 `Settings > Secrets and variables > Actions` 添加：

- `PRODUCT_HUNT_TOKEN`：Product Hunt API Access Token，必需。
- `OPENAI_API_KEY`：可选；用于把每条简介生成中文。未配置时会使用中文兜底说明。

然后在 Vercel 导入 `abnerzhao/daily-tech-stack`，保持默认静态站点配置，Production Branch 设为 `main`。不需要配置 Vercel Token 或额外部署工作流。

本地或远程服务器手动运行：

```bash
cd /path/to/daily-tech-stack
npm run daily:update
git add index.html && git commit -m "更新：$(date +%F) 技术热榜" && git push
```

服务器可使用 cron（北京时间 07:30）：

```cron
30 7 * * * cd /path/to/daily-tech-stack && /usr/bin/npm run daily:update && git add index.html && git commit -m "更新：$(date +\%F) 技术热榜" && git push
```
