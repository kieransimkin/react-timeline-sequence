import { useCallback, useEffect, useRef, useState } from "react";
import { LoopAudio, loopRange, wrapLoopTime } from "./LoopAudio";
import type { TimelineLoop } from "./types";

/** One transport for native full-song audio and buffered loop audio. */
export function useTimelineTransport(
  audioRef: { current: HTMLAudioElement | null }, audioSrc: string,
  activeLoop: TimelineLoop | null, onError?: (error: unknown) => void,
  credentials: RequestCredentials = "same-origin",
) {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const desired = useRef(false);
  const mode = useRef<"media" | "loop">("media");
  const engine = useRef<LoopAudio | null>(null);
  const intent = useRef(0);
  const current = useRef({ audioSrc, activeLoop, onError, credentials });
  current.current = { audioSrc, activeLoop, onError, credentials };

  const readTime = useCallback(() => mode.current === "loop"
    ? (engine.current?.currentTime ?? 0) : (audioRef.current?.currentTime ?? 0), [audioRef]);

  const pause = useCallback(() => {
    const next = readTime();
    intent.current += 1;
    desired.current = false;
    engine.current?.pause();
    audioRef.current?.pause();
    setLoading(false);
    setPlaying(false);
    setTime(next);
    return next;
  }, [audioRef, readTime]);

  const fail = useCallback((cause: unknown) => {
    pause();
    setError(cause instanceof Error ? cause.message : String(cause));
    current.current.onError?.(cause);
  }, [pause]);

  const playAt = useCallback(async (next: number) => {
    pause();
    const version = intent.current;
    desired.current = true;
    setLoading(true);
    setError("");
    const { activeLoop: loop, audioSrc: src, credentials: cred } = current.current;
    try {
      if (loop) {
        mode.current = "loop";
        engine.current ??= new LoopAudio();
        if (!(await engine.current.play(loop, src, next, cred))) return;
      } else {
        mode.current = "media";
        const audio = audioRef.current;
        if (!audio) return;
        audio.currentTime = Math.max(0, next);
        await audio.play();
      }
      if (version !== intent.current) return;
      setTime(readTime());
      setLoading(false);
      setPlaying(true);
    } catch (cause) {
      if (version === intent.current) fail(cause);
    }
  }, [audioRef, fail, pause, readTime]);

  const seek = useCallback((next: number) => {
    const loop = current.current.activeLoop;
    if (loop) {
      const range = loopRange(loop);
      next = wrapLoopTime(next, range.start, range.end);
    }
    if (desired.current) {
      void playAt(next);
    } else {
      pause();
      // A paused seek belongs to the shared timeline, independent of the last backend.
      mode.current = "media";
      if (audioRef.current) audioRef.current.currentTime = next;
      setTime(next);
    }
  }, [audioRef, pause, playAt]);

  const toggle = useCallback(() => {
    if (desired.current) { pause(); return; }
    let next = readTime();
    const loop = current.current.activeLoop;
    if (loop) {
      const range = loopRange(loop);
      if (next < range.start || next >= range.end) next = range.start;
    }
    void playAt(next);
  }, [pause, playAt, readTime]);

  useEffect(() => {
    pause();
    mode.current = "media";
    setTime(0);
    setError("");
    engine.current?.dispose();
    engine.current = null;
    return () => {
      intent.current += 1;
      desired.current = false;
      engine.current?.dispose();
      engine.current = null;
      audioRef.current?.pause();
    };
  }, [audioSrc, audioRef, pause]);

  const key = activeLoop
    ? JSON.stringify([activeLoop.id, activeLoop.startSample, activeLoop.endSample, activeLoop.sampleRate, activeLoop.audioSrc])
    : "";
  useEffect(() => {
    const resume = desired.current;
    let next = pause();
    const loop = current.current.activeLoop;
    if (loop) next = loopRange(loop).start;
    mode.current = "media";
    if (audioRef.current) audioRef.current.currentTime = next;
    setTime(next);
    if (resume) void playAt(next);
  }, [key, audioRef, pause, playAt]);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const tick = () => {
      setTime(readTime());
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, readTime]);

  const ended = useCallback(() => {
    if (mode.current === "media") pause();
  }, [pause]);
  return { time, playing, loading, error, toggle, seek, ended, fail };
}
