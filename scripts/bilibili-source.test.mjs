import test from "node:test";
import assert from "node:assert/strict";
import { parseBilibiliPopular } from "./bilibili-source.mjs";

test("parses Bilibili popular video metrics", () => {
  const [video] = parseBilibiliPopular({
    code: 0,
    data: {
      list: [{
        bvid: "BV1example",
        title: "热门视频",
        desc: "视频简介\n第二行",
        pubdate: 1_785_668_400,
        duration: 125,
        owner: { name: "示例 UP 主" },
        stat: { view: 1_230_000, like: 56_000, reply: 789 },
      }],
    },
  });

  assert.deepEqual(video, {
    key: "bilibili-0",
    source: "bilibili",
    title: "热门视频",
    url: "https://www.bilibili.com/video/BV1example",
    owner: "示例 UP 主",
    publishedAt: "2026-08-02 19:00",
    views: 1_230_000,
    likes: 56_000,
    comments: 789,
    duration: 125,
    context: "视频简介 第二行",
  });
});

test("rejects malformed Bilibili responses", () => {
  assert.throws(() => parseBilibiliPopular({ code: -1 }), /Bilibili Popular/);
});
