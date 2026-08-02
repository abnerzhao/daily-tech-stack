export function parseBilibiliPopular(payload) {
  if (payload?.code !== 0 || !Array.isArray(payload?.data?.list)) {
    throw new Error("Unable to parse Bilibili Popular");
  }

  return payload.data.list.map((video, index) => {
    if (!video?.bvid || !video?.title) throw new Error("Unable to parse a Bilibili video");
    return {
      key: `bilibili-${index}`,
      source: "bilibili",
      title: video.title,
      url: `https://www.bilibili.com/video/${video.bvid}`,
      owner: video.owner?.name ?? "Unknown",
      publishedAt: formatPublishedAt(video.pubdate),
      views: Number(video.stat?.view) || 0,
      likes: Number(video.stat?.like) || 0,
      comments: Number(video.stat?.reply) || 0,
      duration: Number(video.duration) || 0,
      context: normalizeDescription(video.desc) || video.rcmd_reason?.content || video.title,
    };
  });
}

function formatPublishedAt(timestamp) {
  if (!Number(timestamp)) return "Unknown";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(Number(timestamp) * 1000));
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}`;
}

function normalizeDescription(value = "") {
  const description = String(value).replace(/\s+/g, " ").trim();
  return description === "-" ? "" : description;
}
