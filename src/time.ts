export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function formatTimelineTime(seconds: number): string {
  const safe = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safe / 60);
  const wholeSeconds = Math.floor(safe % 60);
  const milliseconds = Math.floor((safe - Math.floor(safe)) * 1000);
  return `${String(minutes).padStart(2, "0")}:${String(wholeSeconds).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")}`;
}

export function chooseRulerStep(pixelsPerSecond: number): number {
  const candidates = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
  return candidates.find(value => value * pixelsPerSecond >= 70) ?? candidates[candidates.length - 1];
}

export function visibleTimelineWindow(
  scrollLeft: number,
  viewportWidth: number,
  labelWidth: number,
  pixelsPerSecond: number,
  duration: number,
): { start: number; end: number } {
  if (duration <= 0 || pixelsPerSecond <= 0) return { start: 0, end: 0 };
  const leftPixels = Math.max(0, scrollLeft - labelWidth);
  const rightPixels = Math.max(0, scrollLeft + viewportWidth - labelWidth);
  const start = clamp(leftPixels / pixelsPerSecond, 0, duration);
  const end = clamp(rightPixels / pixelsPerSecond, start, duration);
  return { start, end };
}
