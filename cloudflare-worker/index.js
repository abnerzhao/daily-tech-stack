const GITHUB_API_VERSION = "2026-03-10";
const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;

export default {
  async scheduled(controller, env) {
    await dispatchDailyWorkflow(env, controller.scheduledTime);
  },
};

export async function dispatchDailyWorkflow(env, scheduledTime, fetchImpl = fetch) {
  if (!env.GITHUB_ACTIONS_TOKEN) throw new Error("GITHUB_ACTIONS_TOKEN is required");

  const owner = env.GITHUB_OWNER || "abnerzhao";
  const repository = env.GITHUB_REPO || "daily-tech-stack";
  const workflow = env.GITHUB_WORKFLOW || "daily-update.yml";
  const ref = env.GITHUB_REF || "main";
  const issueDate = shanghaiDate(scheduledTime);
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/actions/workflows/${encodeURIComponent(workflow)}/dispatches`;
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${env.GITHUB_ACTIONS_TOKEN}`,
      "content-type": "application/json",
      "user-agent": "daily-tech-stack-cloudflare-trigger",
      "x-github-api-version": GITHUB_API_VERSION,
    },
    body: JSON.stringify({ ref, inputs: { date: issueDate } }),
  });

  if (!response.ok) {
    const details = (await response.text()).slice(0, 500);
    throw new Error(`GitHub workflow dispatch failed (${response.status}): ${details}`);
  }

  console.log(`Dispatched ${workflow} for ${issueDate}`);
  return { issueDate, status: response.status };
}

export function shanghaiDate(timestamp) {
  const value = Number.isFinite(timestamp) ? timestamp : Date.now();
  return new Date(value + SHANGHAI_OFFSET_MS).toISOString().slice(0, 10);
}
