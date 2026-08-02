import test from "node:test";
import assert from "node:assert/strict";
import { parseAppleTechEpisodes, parseAppleTechPodcasts } from "./podcast-sources.mjs";

test("parses Apple Technology podcast chart entries", () => {
  const [podcast] = parseAppleTechPodcasts({
    feed: {
      entry: [{
        "im:name": { label: "Hard Fork" },
        "im:artist": { label: "The New York Times" },
        "im:releaseDate": { attributes: { label: "July 31, 2026" } },
        id: { attributes: { "im:id": "1528594034" } },
        link: { attributes: { href: "https://podcasts.apple.com/us/podcast/hard-fork/id1528594034" } },
        summary: { label: "A weekly look at technology and the future." },
      }],
    },
  });

  assert.deepEqual(podcast, {
    key: "tech-podcast-0",
    source: "tech-podcast",
    title: "Hard Fork",
    url: "https://podcasts.apple.com/us/podcast/hard-fork/id1528594034",
    appleId: "1528594034",
    author: "The New York Times",
    releasedAt: "July 31, 2026",
    context: "A weekly look at technology and the future.",
  });
});

test("matches each ranked show with its latest episode", () => {
  const chart = {
    feed: {
      entry: [{
        "im:name": { label: "Hard Fork" },
        "im:artist": { label: "The New York Times" },
        id: { attributes: { "im:id": "1528594034" } },
        link: { attributes: { href: "https://podcasts.apple.com/us/podcast/hard-fork/id1528594034" } },
        summary: { label: "A weekly technology podcast." },
      }],
    },
  };
  const [episode] = parseAppleTechEpisodes(chart, {
    results: [{
      wrapperType: "podcastEpisode",
      collectionId: 1528594034,
      collectionName: "Hard Fork",
      trackName: "Open Model Wars",
      trackViewUrl: "https://podcasts.apple.com/us/podcast/id1528594034?i=1000779262027",
      releaseDate: "2026-07-31T11:00:00Z",
      trackTimeMillis: 4_007_000,
      shortDescription: "A look at the latest open model debate.",
    }],
  });

  assert.deepEqual(episode, {
    key: "tech-podcast-0",
    source: "tech-podcast",
    title: "Open Model Wars",
    url: "https://podcasts.apple.com/us/podcast/id1528594034?i=1000779262027",
    podcastName: "Hard Fork",
    spotifyUrl: "https://open.spotify.com/search/Hard%20Fork%20Open%20Model%20Wars",
    youtubeUrl: "https://www.youtube.com/results?search_query=Hard%20Fork%20Open%20Model%20Wars",
    releasedAt: "Jul 31, 2026",
    duration: 67,
    context: "A weekly technology podcast.",
    episodeContext: "A look at the latest open model debate.",
  });
});

test("rejects malformed Apple podcast feeds", () => {
  assert.throws(() => parseAppleTechPodcasts({}), /Apple Podcasts/);
  assert.throws(() => parseAppleTechEpisodes({ feed: { entry: [] } }, {}), /episodes/);
});
