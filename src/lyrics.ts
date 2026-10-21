import type { TimelineBlock, TimelineLyricLine, TimelineLyricWord } from "./types";

export const TIMELINE_LYRIC_AUDITION_API_VERSION = 2;

export interface LyricInterval {
  start: number;
  end: number;
  text: string;
  id?: string;
}

export interface LyricWordState {
  text: string;
  start: number;
  end: number;
  active: boolean;
}

export interface LyricLineState {
  text: string;
  words: readonly LyricWordState[];
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
    return [{ start: item.start, end, text: item.label ?? "",
      ...("id" in item && typeof item.id === "string" ? {id: item.id} : {}) }];
  });
}

export function lyricsAtTime(intervals: readonly LyricInterval[], time: number): string[] {
  if (!Number.isFinite(time) || time < 0) return [];
  return intervals.filter(item => item.start <= time && time < item.end && item.text.trim())
    .map(item => item.text);
}

/** Return visible lines and their timed words without inventing timing. Line
 * and word ends are exclusive. Explicit lineId association preserves parallel
 * lead/backing-vocal lines; otherwise words are matched by time containment. */
export function lyricLineStatesAtTime(
  lines: readonly TimelineLyricLine[], words: readonly TimelineLyricWord[],
  time: number, duration: number,
): LyricLineState[] {
  if (!Number.isFinite(time) || time < 0) return [];
  const normalizedLines = lyricIntervals(lines, duration);
  return normalizedLines.flatMap(line => {
    if (!(line.start <= time && time < line.end) || !line.text.trim()) return [];
    const lineWords = words.filter(word => {
      if (!Number.isFinite(word.start) || !Number.isFinite(word.end) || word.end! <= word.start) return false;
      if (line.id && word.lineId !== undefined) return word.lineId === line.id;
      return word.start >= line.start && word.end! <= line.end;
    }).slice().sort((a, b) => a.start - b.start).map(word => ({
      text: word.label ?? "", start: word.start, end: word.end!,
      active: word.start <= time && time < word.end!,
    })).filter(word => word.text.trim());
    return [{text: line.text, words: lineWords}];
  });
}
