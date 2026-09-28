import { describe, expect, it } from "vitest";
import { chooseRulerStep, formatTimelineTime, visibleTimelineWindow } from "../src/time";

describe("timeline helpers", () => {
  it("formats sub-second positions without rounding into the next second", () => {
    expect(formatTimelineTime(65.9999)).toBe("01:05.999");
    expect(formatTimelineTime(-2)).toBe("00:00.000");
  });

  it("chooses a ruler step with room for labels", () => {
    expect(chooseRulerStep(100)).toBe(1);
    expect(chooseRulerStep(10)).toBe(10);
  });

  it("calculates and clamps the visible song window", () => {
    expect(visibleTimelineWindow(0, 500, 200, 10, 60)).toEqual({ start: 0, end: 30 });
    expect(visibleTimelineWindow(700, 500, 200, 10, 60)).toEqual({ start: 50, end: 60 });
  });
});
