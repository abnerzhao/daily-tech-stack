import assert from "node:assert/strict";
import test from "node:test";
import { dispatchDailyWorkflow, shanghaiDate } from "./index.js";

test("formats the scheduled issue date in Asia/Shanghai", () => {
  assert.equal(shanghaiDate(Date.UTC(2026, 7, 3, 2)), "2026-08-03");
  assert.equal(shanghaiDate(Date.UTC(2026, 7, 3, 16)), "2026-08-04");
});

test("dispatches the daily workflow with the Shanghai date", async () => {
  let request;
  const result = await dispatchDailyWorkflow({
    GITHUB_ACTIONS_TOKEN: "test-token",
    GITHUB_OWNER: "abnerzhao",
    GITHUB_REPO: "daily-tech-stack",
    GITHUB_WORKFLOW: "daily-update.yml",
    GITHUB_REF: "main",
  }, Date.UTC(2026, 7, 3, 2), async (url, options) => {
    request = { url, options };
    return { ok: true, status: 200, text: async () => "" };
  });

  assert.equal(request.url, "https://api.github.com/repos/abnerzhao/daily-tech-stack/actions/workflows/daily-update.yml/dispatches");
  assert.equal(request.options.method, "POST");
  assert.equal(request.options.headers.authorization, "Bearer test-token");
  assert.deepEqual(JSON.parse(request.options.body), {
    ref: "main",
    inputs: { date: "2026-08-03" },
  });
  assert.deepEqual(result, { issueDate: "2026-08-03", status: 200 });
});

test("surfaces GitHub dispatch errors", async () => {
  await assert.rejects(
    dispatchDailyWorkflow({ GITHUB_ACTIONS_TOKEN: "bad-token" }, Date.now(), async () => ({
      ok: false,
      status: 401,
      text: async () => "Bad credentials",
    })),
    /GitHub workflow dispatch failed \(401\): Bad credentials/,
  );
});
