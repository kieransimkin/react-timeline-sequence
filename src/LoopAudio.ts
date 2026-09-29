import type { TimelineLoop } from "./types";

/** Versioned capability check for adapters consuming a locally patched package. */
export const TIMELINE_LOOP_API_VERSION = 1;

export function loopRange(loop: TimelineLoop) {
  if (!loop.id || !Number.isSafeInteger(loop.startSample) || !Number.isSafeInteger(loop.endSample)
      || !Number.isFinite(loop.sampleRate) || loop.sampleRate <= 0
      || loop.startSample < 0 || loop.endSample <= loop.startSample) {
    throw new RangeError("A loop needs an id, valid sample rate and increasing integer sample bounds");
  }
  return { start: loop.startSample / loop.sampleRate, end: loop.endSample / loop.sampleRate,
    duration: (loop.endSample - loop.startSample) / loop.sampleRate };
}

export function validLoops(loops: readonly TimelineLoop[], duration = 0): TimelineLoop[] {
  const ids = new Set<string>();
  return loops.filter(loop => {
    try {
      const range = loopRange(loop);
      if (ids.has(loop.id) || (duration > 0 && range.end > duration + 0.02)) return false;
      ids.add(loop.id);
      return true;
    } catch { return false; }
  });
}

export function wrapLoopTime(time: number, start: number, end: number): number {
  const length = end - start;
  if (!Number.isFinite(time) || length <= 0) return start;
  return start + (((time - start) % length) + length) % length;
}

/** Web Audio owns repeat timing; animation frames only READ its audio clock. */
export class LoopAudio {
  private context: AudioContext | null = null;
  private node: AudioBufferSourceNode | null = null;
  private generation = 0;
  private abort: AbortController | null = null;
  private cache: { url: string; buffer: AudioBuffer } | null = null;
  private anchor = 0;
  private offset = 0;
  private start = 0;
  private length = 1;
  private stoppedTime = 0;

  constructor(private createContext = () => new AudioContext()) {}

  get playing(): boolean { return this.node !== null; }

  get currentTime(): number {
    if (!this.node || !this.context) return this.stoppedTime;
    const elapsed = Math.max(0, this.context.currentTime - this.anchor);
    return this.start + (this.offset + elapsed) % this.length;
  }

  pause(): number {
    this.stoppedTime = this.currentTime;
    this.generation += 1;
    this.abort?.abort();
    this.abort = null;
    if (this.node) {
      this.node.stop();
      this.node.disconnect();
      this.node = null;
    }
    return this.stoppedTime;
  }

  async play(loop: TimelineLoop, masterSrc: string, time: number,
             credentials: RequestCredentials = "same-origin"): Promise<boolean> {
    const range = loopRange(loop);
    this.pause();
    const generation = this.generation;
    this.context ??= this.createContext();
    const context = this.context;
    // Invoke resume while still on the user-gesture call stack.
    const resumed = context.resume();
    void resumed.catch(() => {});
    const url = loop.audioSrc || masterSrc;
    const cacheKey = JSON.stringify([url, loop.startSample, loop.endSample, loop.sampleRate]);
    try {
      let buffer = this.cache?.url === cacheKey ? this.cache.buffer : null;
      if (!buffer) {
        const controller = new AbortController();
        this.abort = controller;
        const response = await fetch(url, { signal: controller.signal, credentials });
        if (!response.ok) throw new Error(`Could not load loop audio (HTTP ${response.status})`);
        const limit = 128 * 1024 * 1024;
        if (Number(response.headers.get("Content-Length")) > limit) throw new Error("Loop audio exceeds 128 MiB");
        const bytes = await response.arrayBuffer();
        if (bytes.byteLength > limit) throw new Error("Loop audio exceeds 128 MiB");
        buffer = await context.decodeAudioData(bytes);
        if (generation !== this.generation) return false;
        this.cache = { url: cacheKey, buffer }; // One entry: source changes cannot retain an unbounded cache.
      }
      await resumed;
      if (generation !== this.generation) return false;
      const begin = loop.audioSrc ? 0 : range.start;
      const end = begin + range.duration;
      const tolerance = Math.max(2 / buffer.sampleRate, 0.002);
      if (!Number.isFinite(buffer.duration) || buffer.duration <= begin
          || end > buffer.duration + tolerance
          || (loop.audioSrc && Math.abs(buffer.duration - range.duration) > tolerance)) {
        throw new Error("Loop audio duration does not match the reported sample boundaries");
      }
      const node = context.createBufferSource();
      node.buffer = buffer;
      node.loop = true;
      node.loopStart = begin;
      node.loopEnd = Math.min(end, buffer.duration);
      node.connect(context.destination);
      this.start = range.start;
      this.length = node.loopEnd - begin;
      this.offset = wrapLoopTime(time, range.start, range.start + this.length) - range.start;
      this.anchor = context.currentTime;
      node.start(this.anchor, begin + this.offset);
      this.node = node;
      return true;
    } catch (error) {
      // A paused, switched or unmounted transport must never resurrect a stale request.
      if (generation !== this.generation) return false;
      throw error;
    } finally {
      // Avoid an unhandled rejection when fetch failed before await resumed.
      void resumed.catch(() => {});
    }
  }

  dispose(): void {
    this.pause();
    this.cache = null;
    const context = this.context;
    this.context = null;
    if (context) void context.close().catch(() => {});
  }
}
