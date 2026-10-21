import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { lyricIntervals, lyricsAtTime } from "../src/lyrics";
import { TimelineSequence } from "../src/TimelineSequence";

describe("lyric audition intervals", () => {
  it("uses exact starts and exclusive ends, including gaps and backward seeks", () => {
    const intervals = lyricIntervals([{start: 1, end: 2, label: "First"}, {start: 3, end: 4, label: "Next"}], 8);
    expect(lyricsAtTime(intervals, .999)).toEqual([]);
    expect(lyricsAtTime(intervals, 1)).toEqual(["First"]);
    expect(lyricsAtTime(intervals, 2)).toEqual([]);
    expect(lyricsAtTime(intervals, 3)).toEqual(["Next"]);
    expect(lyricsAtTime(intervals, 1.25)).toEqual(["First"]);
    expect(lyricsAtTime(intervals, 8)).toEqual([]);
  });
  it("sorts start-only LRC lines without mutating input and keeps empty clear cues", () => {
    const items = [{start: 4, label: "Last"}, {start: 1, label: "First"}, {start: 2, label: ""}];
    const intervals = lyricIntervals(items, 6);
    expect(items[0].start).toBe(4);
    expect(lyricsAtTime(intervals, 1)).toEqual(["First"]);
    expect(lyricsAtTime(intervals, 2)).toEqual([]);
    expect(lyricsAtTime(intervals, 5.999)).toEqual(["Last"]);
    expect(lyricsAtTime(intervals, 6)).toEqual([]);
  });
  it("retains overlapping and simultaneous lines and clamps to the source end", () => {
    const intervals = lyricIntervals([{start: 1, label: "One"}, {start: 1, label: "Two"},
      {start: 2, end: 99, label: "Three"}], 3);
    expect(lyricsAtTime(intervals, 1.5)).toEqual(["One", "Two"]);
    expect(lyricsAtTime(intervals, 2)).toEqual(["Three"]);
    expect(intervals[intervals.length - 1]?.end).toBe(3);
  });
  it("rejects malformed bounds and withholds an unbounded last line", () => {
    const bad = [{start: NaN, end: 5}, {start: -1, end: 5}, {start: 1, end: 1},
      {start: 1, end: NaN}, {start: 3, label: "Unbounded"}];
    expect(lyricIntervals(bad, NaN)).toEqual([]);
    expect(lyricsAtTime([{start:0,end:1,text:"Hello"}], NaN)).toEqual([]);
    expect(lyricsAtTime([{start:0,end:1,text:"Hello"}], -1)).toEqual([]);
  });
});

describe("lyric audition opt-in and safe rendering", () => {
  const lane = {id:"lyrics",title:"Lyrics",content:{type:"timing" as const,kind:"line" as const,
    items:[{id:"one",start:0,end:2,label:"<script> & Unicode: café"}]}};
  it("keeps existing hosts unchanged", () => {
    expect(renderToStaticMarkup(<TimelineSequence audioSrc="/song.wav" lanes={[lane]}/>))
      .not.toContain("Lyric timing audition");
  });
  it("uses line timings, escapes text and accepts accessible artwork descriptions", () => {
    const html = renderToStaticMarkup(<TimelineSequence audioSrc="/vocals.wav" duration={4} lanes={[lane]}
      lyricAudition={{artworkSrc:"/cover.svg",artworkAlt:"Test cover",audioLabel:"Vocals"}}/>);
    expect(html).toContain('aria-label="Audition lyrics"');
    expect(html).toContain('alt="Test cover"');
    expect(html).toContain("Vocals");
    expect(html).toContain("&lt;script&gt; &amp; Unicode: café");
  });
  it("never substitutes a different lane when a pinned source is missing", () => {
    const html = renderToStaticMarkup(<TimelineSequence audioSrc="/song.wav" duration={4} lanes={[lane]}
      lyricAudition={{laneId:"missing"}}/>);
    expect(html).toContain("No timed lyrics available");
    expect(html).toContain("Cover artwork unavailable");
    expect(html.slice(html.indexOf('<aside'))).not.toContain("&lt;script&gt;");
  });
  it("supports host-adapted cues and starts hidden when requested", () => {
    const config = {items:[{start:0,end:2,label:"Adapted"}],enabledByDefault:false};
    const html = renderToStaticMarkup(<TimelineSequence audioSrc="/song.wav" lanes={[]} lyricAudition={config}/>);
    expect(html).toContain('aria-label="Audition lyrics"');
    expect(html).not.toContain('aria-label="Timed lyrics"');
  });
});
