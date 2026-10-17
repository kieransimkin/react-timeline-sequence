/** Native 64-pip timing shared by editable tracks and playback displays.
 * Fixed clocks are an explicit BPM and Beat 1 offset. Variable clocks use the
 * actual integer sample-frame anchors, never a single approximating BPM.
 * This module never changes audio, analysis or timing evidence.
 */
export const PIPS_PER_BEAT = 64 as const;
export const TICKS_PER_BEAT = 16 as const;

export interface FixedBeatClock {
  mode: "fixed";
  bpm: number;
  firstBeatSeconds: number;
  /** Signed audio-time-zero offset in native 64 pips/beat; optional cross-check. */
  offsetPips?: number;
}
export interface VariableBeatClock {
  mode: "variable";
  pips_per_beat: 64;
  source_audio: { sample_rate: number; num_frames?: number; sha256?: string };
  origin_beat: number;
  beats: readonly { beat: number; frame: number }[];
}
export type TimelineBeatClock = FixedBeatClock | VariableBeatClock;
export interface BeatMatch {
  beat: number;
  time: number;
  errorSeconds: number;
  errorMilliseconds: number;
  withinTolerance: boolean;
  mode: TimelineBeatClock["mode"];
}

function finite(value: number, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new RangeError(`${label} must be finite`);
  return value;
}
function integer(value: number, label: string): number {
  if (!Number.isSafeInteger(value)) throw new RangeError(`${label} must be a safe integer`);
  return value;
}

export function validateBeatClock(clock: TimelineBeatClock): TimelineBeatClock {
  if (!clock || typeof clock !== "object") throw new TypeError("Beat clock is required");
  if (clock.mode === "fixed") {
    if (finite(clock.bpm, "BPM") < 20 || clock.bpm > 400) throw new RangeError("Fixed BPM must be 20..400");
    if (finite(clock.firstBeatSeconds, "Beat 1") < 0 || clock.firstBeatSeconds > 86400)
      throw new RangeError("Fixed Beat 1 must be in source time");
    if (clock.offsetPips !== undefined &&
        Math.abs(finite(clock.offsetPips, "offset pips") + clock.firstBeatSeconds * clock.bpm * 64 / 60) > 1e-6)
      throw new RangeError("Fixed BPM / phase offset and Beat 1 disagree");
    return clock;
  }
  if (clock.mode !== "variable" || clock.pips_per_beat !== 64) throw new TypeError("Expected a fixed or 64-pip variable clock");
  const sr = integer(clock.source_audio?.sample_rate, "sample rate");
  if (sr < 1 || sr > 768000) throw new RangeError("Invalid source sample rate");
  if (!Array.isArray(clock.beats) || clock.beats.length < 2 || clock.beats.length > 25000)
    throw new RangeError("Variable clock requires 2..25000 real beat anchors");
  integer(clock.origin_beat, "Beat 1 index");
  if (clock.origin_beat < 0) throw new RangeError("Beat 1 must be a nonnegative index");
  if (clock.source_audio.num_frames !== undefined &&
      (!Number.isSafeInteger(clock.source_audio.num_frames) || clock.source_audio.num_frames < 2))
    throw new RangeError("Source frame count must be a safe positive integer");
  let beat = -1, frame = -1, foundOrigin = false;
  for (const anchor of clock.beats) {
    const b = integer(anchor.beat, "beat index"), f = integer(anchor.frame, "source frame");
    if (b <= beat || f <= frame || b < 0 || f < 0 ||
        (clock.source_audio.num_frames !== undefined && f >= clock.source_audio.num_frames))
      throw new RangeError("Variable beat indices and source frames must strictly increase");
    if (b === clock.origin_beat) foundOrigin = true;
    beat = b; frame = f;
  }
  if (!foundOrigin) throw new RangeError("Beat 1 must be an actual recorded anchor");
  return clock;
}

function segment(clock: VariableBeatClock, seconds: number): number {
  const frame = seconds * clock.source_audio.sample_rate, rows = clock.beats;
  let lo = 0, hi = rows.length;
  while (lo < hi) { const m = (lo + hi) >>> 1; if (rows[m].frame <= frame) lo = m + 1; else hi = m; }
  return Math.max(0, Math.min(rows.length - 2, lo - 1));
}
export function phasePipsAt(clock: TimelineBeatClock, seconds: number): number {
  finite(seconds, "source seconds");
  if (clock.mode === "fixed") return (seconds - clock.firstBeatSeconds) * clock.bpm * 64 / 60;
  const i = segment(clock, seconds), a = clock.beats[i], b = clock.beats[i + 1];
  return 64 * (a.beat - clock.origin_beat +
    (seconds * clock.source_audio.sample_rate - a.frame) * (b.beat - a.beat) / (b.frame - a.frame));
}
export function secondsAtPips(clock: TimelineBeatClock, pips: number): number {
  finite(pips, "pips");
  if (clock.mode === "fixed") return clock.firstBeatSeconds + pips * 60 / (clock.bpm * 64);
  const beat = clock.origin_beat + pips / 64, rows = clock.beats;
  let lo = 0, hi = rows.length;
  while (lo < hi) { const m = (lo + hi) >>> 1; if (rows[m].beat <= beat) lo = m + 1; else hi = m; }
  const i = Math.max(0, Math.min(rows.length - 2, lo - 1)), a = rows[i], b = rows[i + 1];
  return (a.frame + (beat - a.beat) * (b.frame - a.frame) / (b.beat - a.beat)) / clock.source_audio.sample_rate;
}
export function tempoAtSeconds(clock: TimelineBeatClock, seconds: number): number {
  finite(seconds, "source seconds");
  if (clock.mode === "fixed") return clock.bpm;
  const i = segment(clock, seconds), a = clock.beats[i], b = clock.beats[i + 1];
  return 60 * clock.source_audio.sample_rate * (b.beat - a.beat) / (b.frame - a.frame);
}

/** Match to a *real* variable anchor, not an inferred beat in a detected gap. */
export function matchBeat(clock: TimelineBeatClock, seconds: number, toleranceSeconds = .15): BeatMatch {
  finite(seconds, "source seconds");
  if (finite(toleranceSeconds, "tolerance") < 0 || toleranceSeconds > 60) throw new RangeError("Invalid snap tolerance");
  let beat: number, time: number;
  if (clock.mode === "fixed") {
    beat = Math.round((seconds - clock.firstBeatSeconds) * clock.bpm / 60);
    time = clock.firstBeatSeconds + beat * 60 / clock.bpm;
  } else {
    const anchors = clock.beats, sr = clock.source_audio.sample_rate;
    const idx = segment(clock, seconds);
    const choices = [anchors[idx], anchors[idx + 1]];
    const winner = choices.reduce((a, b) => Math.abs(a.frame / sr - seconds) <= Math.abs(b.frame / sr - seconds) ? a : b);
    beat = winner.beat - clock.origin_beat;
    time = winner.frame / sr;
  }
  const error = seconds - time;
  return { beat, time, errorSeconds: error, errorMilliseconds: error * 1000,
    withinTolerance: Math.abs(error) <= toleranceSeconds, mode: clock.mode };
}
/** Passive display grid, bounded even for multi-hour or high-BPM tracks. */
export function beatGrid(clock: TimelineBeatClock, start: number, end: number, limit = 2000): Array<{time: number; label: string; emphasis: boolean}> {
  if (!(Number.isFinite(start) && Number.isFinite(end) && end > start)) return [];
  const cap = Math.max(1, Math.min(2000, Math.floor(limit)));
  if (clock.mode === "variable") {
    const selected = clock.beats.filter(row => row.frame / clock.source_audio.sample_rate >= start && row.frame / clock.source_audio.sample_rate <= end);
    const stride = Math.max(1, Math.ceil(selected.length / cap));
    return selected.filter((_, i) => i % stride === 0).map(row => ({time: row.frame / clock.source_audio.sample_rate,
      label: `Observed beat ${row.beat}`, emphasis: row.beat === clock.origin_beat}));
  }
  const startBeat = Math.max(Math.ceil((start - clock.firstBeatSeconds) * clock.bpm / 60), Math.ceil(-clock.firstBeatSeconds * clock.bpm / 60));
  const endBeat = Math.floor((end - clock.firstBeatSeconds) * clock.bpm / 60);
  const count = Math.max(0, endBeat - startBeat + 1), stride = Math.max(1, Math.ceil(count / cap));
  const result = [];
  for (let beat = startBeat; beat <= endBeat && result.length < cap; beat += stride) result.push({
    time: clock.firstBeatSeconds + beat * 60 / clock.bpm, label: `Fixed-BPM grid beat ${beat} (not detected)`, emphasis: beat === 0,
  });
  return result;
}
