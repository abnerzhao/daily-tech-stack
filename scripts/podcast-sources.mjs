export function parseAppleTechPodcasts(payload) {
  const entries = payload?.feed?.entry;
  if (!Array.isArray(entries)) throw new Error("Unable to parse Apple Podcasts chart");

  return entries.map((entry, index) => {
    const title = entry?.["im:name"]?.label;
    const url = entry?.link?.attributes?.href ?? entry?.id?.label;
    if (!title || !url) throw new Error("Unable to parse an Apple Podcasts chart entry");
    return {
      key: `tech-podcast-${index}`,
      source: "tech-podcast",
      title,
      url,
      appleId: entry?.id?.attributes?.["im:id"] ?? "",
      author: entry?.["im:artist"]?.label ?? "Unknown",
      releasedAt: entry?.["im:releaseDate"]?.attributes?.label ?? "",
      context: entry?.summary?.label ?? `${title} technology podcast`,
    };
  });
}

export function parseAppleTechEpisodes(chartPayload, lookupPayload) {
  const chart = parseAppleTechPodcasts(chartPayload);
  const episodes = lookupPayload?.results;
  if (!Array.isArray(episodes)) throw new Error("Unable to parse Apple podcast episodes");

  const episodesByShow = new Map(
    episodes
      .filter((entry) => entry?.wrapperType === "podcastEpisode" && entry.collectionId)
      .map((entry) => [String(entry.collectionId), entry]),
  );

  return chart.flatMap((show, index) => {
    const episode = episodesByShow.get(show.appleId);
    if (!episode?.trackName || !episode?.trackViewUrl) return [];
    return [{
      key: `tech-podcast-${index}`,
      source: "tech-podcast",
      title: episode.trackName,
      url: episode.trackViewUrl,
      podcastName: episode.collectionName ?? show.title,
      ...platformSearchUrls(episode.collectionName ?? show.title, episode.trackName),
      releasedAt: formatReleaseDate(episode.releaseDate),
      duration: Math.max(1, Math.round((Number(episode.trackTimeMillis) || 0) / 60_000)),
      context: show.context,
      episodeContext: episode.shortDescription ?? episode.description ?? "",
    }];
  });
}

function platformSearchUrls(podcastName, episodeTitle) {
  const query = encodeURIComponent(`${podcastName} ${episodeTitle}`);
  return {
    spotifyUrl: `https://open.spotify.com/search/${query}`,
    youtubeUrl: `https://www.youtube.com/results?search_query=${query}`,
  };
}

function formatReleaseDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}
