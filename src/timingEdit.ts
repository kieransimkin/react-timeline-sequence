import { matchBeat, type TimelineBeatClock } from "./beatClock";

export type TimingKind = "line" | "word" | "cue";
export interface TimingEvent {
  id: string;
  start: number;
  end?: number;
  label: string;
  parentId?: string;
  className?: string;
}
export type TimingEdge = "start" | "end" | "move";
export interface TimingEditOptions {
  duration: number;
  clock?: TimelineBeatClock | null;
  snap?: boolean;
  toleranceSeconds?: number;
  bounds?: { start: number; end: number };
  previousEnd?: number;
  nextStart?: number;
  minimumDuration?: number;
}
export function editTimingEvent(event: TimingEvent, edge: TimingEdge, seconds: number, options: TimingEditOptions): TimingEvent {
  if (!Number.isFinite(seconds) || !Number.isFinite(options.duration) || options.duration <= 0) throw new RangeError("Invalid timing edit timebase");
  const earliest = Math.max(0, options.bounds?.start ?? 0, options.previousEnd ?? 0);
  const latest = Math.min(options.duration, options.bounds?.end ?? options.duration, options.nextStart ?? options.duration);
  if (latest < earliest) throw new RangeError("No space between neighbouring timing items");
  const minimum = options.minimumDuration ?? 0;
  if (minimum < 0) throw new RangeError("minimumDuration must be nonnegative");
  let wanted = Math.min(latest, Math.max(earliest, seconds));
  if (options.snap && options.clock) {
    const hit = matchBeat(options.clock, wanted, options.toleranceSeconds ?? .15);
    if (hit.withinTolerance) wanted = Math.min(latest, Math.max(earliest, hit.time));
  }
  const hasEnd = event.end !== undefined && Number.isFinite(event.end);
  const width = hasEnd ? Number(event.end) - event.start : 0;
  if (edge === "move") {
    const start = Math.max(earliest, Math.min(Math.max(earliest, latest - width), wanted));
    return hasEnd ? {...event, start, end: start + width} : {...event, start};
  }
  if (edge === "start") {
    const last = hasEnd ? event.end! - minimum : latest;
    if (last < earliest) throw new RangeError("No valid start fits within the parent bounds");
    return {...event, start: Math.min(wanted, last)};
  }
  if (!hasEnd) throw new RangeError("This event has no editable end");
  if (event.start + minimum > latest) throw new RangeError("No valid end fits inside the parent bounds");
  return {...event, end: Math.max(event.start + minimum, wanted)};
}
