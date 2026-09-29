import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TimelineSequence } from "../src/TimelineSequence";
import { loopRange, validLoops, TIMELINE_LOOP_API_VERSION } from "../src/LoopAudio";

describe("sample-based loop UI", () => {
  const loop = { id: "verse", label: "Verse 1", startSample: 0, endSample: 384000, sampleRate: 48000 };
  it("exports a capability version and converts samples at the source rate", () => {
    expect(TIMELINE_LOOP_API_VERSION).toBe(1);
    expect(loopRange(loop)).toEqual({ start: 0, end: 8, duration: 8 });
  });
  it("renders accessible selection and enable controls without creating AudioContext during SSR", () => {
    const html = renderToStaticMarkup(<TimelineSequence audioSrc="/master.wav" duration={16} lanes={[]} loops={[loop]} />);
    expect(html).toContain('aria-label="Select loop"');
    expect(html).toContain('aria-label="Enable loop"');
    expect(html).toContain('aria-label="Select Verse 1"');
    expect(html).toContain('aria-pressed="false"');
  });
  it("keeps existing callers without loops working", () => {
    const html = renderToStaticMarkup(<TimelineSequence audioSrc="/master.wav" lanes={[]} />);
    expect(html).not.toContain('aria-label="Loop controls"');
  });
  it("rejects invalid ranges and duplicated ids", () => {
    expect(validLoops([loop, loop, { ...loop, id: "bad", startSample: NaN }])).toEqual([loop]);
  });
});
