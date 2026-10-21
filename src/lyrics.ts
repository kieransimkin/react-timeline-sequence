import type { TimelineBlock } from "./types";

export const TIMELINE_LYRIC_AUDITION_API_VERSION = 1;

export interface LyricInterval {
  start: number;
  end: number;
  text: string;
}

/** Normalize without changing the host's timings. Explicit ends are exclusive;
 * start-only LRC lines run to the next timestamp or the known source end.
 * Empty lines remain boundaries so instrumental gaps can clear subtitles. */
export function lyricIntervals(items: readonly TimelineBlock[], duration: number): LyricInterval[] {
  const limit = Number.isFinite(duration) && duration > 0 ? duration : Infinity;
  const sorted = items.filter(item => Number.isFinite(item.start) && item.start >= 0 && item.start < limit)
    .slice().sort((a, b) => a.start - b.start);
  let next = limit;
  const ends = new Array<number>(sorted.length);
  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    if (index + 1 < sorted.length && sorted[index + 1].start > sorted[index].start) next = sorted[index + 1].start;
    ends[index] = next;
  }
  return sorted.flatMap((item, index) => {
    const next = ends[index];
    const end = Math.min(item.end ?? next, limit);
    if (!Number.isFinite(end) || end <= item.start) return [];
    return [{ start: item.start, end, text: item.label ?? "" }];
  });
}

export function lyricsAtTime(intervals: readonly LyricInterval[], time: number): string[] {
  if (!Number.isFinite(time) || time < 0) return [];
  return intervals.filter(item => item.start <= time && time < item.end && item.text.trim())
    .map(item => item.text);
}
