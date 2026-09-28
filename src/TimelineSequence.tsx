import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LaneContent } from "./LaneContent";
import { chooseRulerStep, clamp, formatTimelineTime, visibleTimelineWindow } from "./time";
import type { TimelineMarker, TimelineSequenceProps, TimelineWindow } from "./types";

interface RulerTick {
  time: number;
  major: boolean;
}

function createRulerTicks(duration: number, pixelsPerSecond: number): RulerTick[] {
  if (duration <= 0 || pixelsPerSecond <= 0) return [];
  const step = chooseRulerStep(pixelsPerSecond);
  const minor = step / 5;
  const ticks: RulerTick[] = [];
  for (let time = 0; time <= duration + 1e-6; time += minor) {
    ticks.push({
      time,
      major: Math.abs(time / step - Math.round(time / step)) < 1e-5,
    });
  }
  return ticks;
}

export function TimelineSequence({
  audioSrc,
  lanes,
  title = "Audio timeline",
  subtitle,
  duration: durationHint = 0,
  grid = [],
  headerEnd,
  footer,
  className = "",
  labelWidth = 230,
  initialZoom = 20,
  followPlayheadByDefault = true,
  preload = "metadata",
  crossOrigin,
  onDurationChange,
  onTimeChange,
  onWindowChange,
  onPlaybackError,
}: TimelineSequenceProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const [duration, setDuration] = useState(Math.max(0, durationHint));
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setPlaying] = useState(false);
  const [follow, setFollow] = useState(followPlayheadByDefault);
  const [zoom, setZoom] = useState(initialZoom);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [windowRange, setWindowRange] = useState<TimelineWindow>({ start: 0, end: 0 });

  useEffect(() => {
    if (durationHint > 0) setDuration(durationHint);
  }, [durationHint]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const update = () => setViewportWidth(scroller.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, []);

  const fitPixelsPerSecond = duration > 0
    ? Math.max(0.4, Math.max(320, viewportWidth - labelWidth - 16) / duration)
    : 0.4;
  const pixelsPerSecond = Math.max(fitPixelsPerSecond, fitPixelsPerSecond * Math.pow(2, zoom / 18));
  const trackWidth = Math.max(1, duration * pixelsPerSecond);
  const rulerTicks = useMemo(() => createRulerTicks(duration, pixelsPerSecond), [duration, pixelsPerSecond]);

  const updateWindow = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const next = visibleTimelineWindow(scroller.scrollLeft, scroller.clientWidth, labelWidth, pixelsPerSecond, duration);
    setWindowRange(next);
    onWindowChange?.(next);
  }, [duration, labelWidth, onWindowChange, pixelsPerSecond]);

  useEffect(() => {
    updateWindow();
  }, [updateWindow, viewportWidth]);

  const publishTime = useCallback((time: number) => {
    setCurrentTime(time);
    onTimeChange?.(time);
    const scroller = scrollerRef.current;
    if (!scroller || !follow || !isPlaying) return;
    const x = labelWidth + time * pixelsPerSecond;
    const right = scroller.scrollLeft + scroller.clientWidth;
    const margin = Math.min(180, scroller.clientWidth * 0.2);
    if (x > right - margin) scroller.scrollLeft = Math.max(0, x - scroller.clientWidth + margin);
  }, [follow, isPlaying, labelWidth, onTimeChange, pixelsPerSecond]);

  const stopAnimation = useCallback(() => {
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
  }, []);

  const startAnimation = useCallback(() => {
    stopAnimation();
    const step = () => {
      const audio = audioRef.current;
      if (!audio) return;
      publishTime(Number(audio.currentTime) || 0);
      if (!audio.paused && !audio.ended) animationRef.current = requestAnimationFrame(step);
    };
    animationRef.current = requestAnimationFrame(step);
  }, [publishTime, stopAnimation]);

  useEffect(() => stopAnimation, [stopAnimation]);

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio || duration <= 0) return;
    try {
      if (audio.paused) await audio.play();
      else audio.pause();
    } catch (error) {
      onPlaybackError?.(error);
    }
  };

  const seek = (event: React.MouseEvent<HTMLDivElement>) => {
    if (duration <= 0 || (event.target as HTMLElement).closest(".rts-label, a, button, input")) return;
    const scroller = scrollerRef.current;
    const audio = audioRef.current;
    if (!scroller || !audio) return;
    const rect = scroller.getBoundingClientRect();
    const contentX = event.clientX - rect.left + scroller.scrollLeft - labelWidth;
    if (contentX < 0) return;
    const next = clamp(contentX / pixelsPerSecond, 0, duration);
    audio.currentTime = next;
    publishTime(next);
  };

  const changeZoom = (next: number) => {
    const scroller = scrollerRef.current;
    const centreTime = scroller
      ? Math.max(0, (scroller.scrollLeft + scroller.clientWidth / 2 - labelWidth) / pixelsPerSecond)
      : 0;
    setZoom(next);
    requestAnimationFrame(() => {
      const updated = scrollerRef.current;
      if (!updated) return;
      const nextFit = duration > 0 ? Math.max(0.4, Math.max(320, updated.clientWidth - labelWidth - 16) / duration) : 0.4;
      const nextPixels = Math.max(nextFit, nextFit * Math.pow(2, next / 18));
      updated.scrollLeft = Math.max(0, labelWidth + centreTime * nextPixels - updated.clientWidth / 2);
      updateWindow();
    });
  };

  const handleMetadata = () => {
    const mediaDuration = Number(audioRef.current?.duration) || 0;
    if (mediaDuration > 0) {
      setDuration(mediaDuration);
      onDurationChange?.(mediaDuration);
    }
  };

  return <section
    className={`rts-sequence ${className}`}
    style={{ "--rts-label-width": `${labelWidth}px`, "--rts-track-width": `${trackWidth}px` } as React.CSSProperties}
  >
    <header className="rts-toolbar">
      <div className="rts-ident">
        <strong>{title}</strong>
        {subtitle && <span>{subtitle}</span>}
      </div>
      <div className="rts-transport" aria-label="Timeline playback controls">
        <button type="button" className="rts-button rts-play" onClick={togglePlayback} aria-label={isPlaying ? "Pause" : "Play"}>{isPlaying ? "❚❚" : "▶"}</button>
        <output className="rts-time" aria-live="off">{formatTimelineTime(currentTime)} / {formatTimelineTime(duration)}</output>
        <button type="button" className="rts-button" onClick={() => changeZoom(0)}>Fit</button>
        <label className="rts-control"><span>Zoom</span><input aria-label="Timeline zoom" type="range" min="0" max="100" value={zoom} onChange={event => changeZoom(Number(event.target.value))} /></label>
        <label className="rts-control"><input type="checkbox" checked={follow} onChange={event => setFollow(event.target.checked)} /><span>Follow</span></label>
      </div>
      <div className="rts-header-end">{headerEnd}</div>
    </header>

    <audio
      ref={audioRef}
      src={audioSrc}
      preload={preload}
      crossOrigin={crossOrigin}
      onLoadedMetadata={handleMetadata}
      onPlay={() => { setPlaying(true); startAnimation(); }}
      onPause={() => { setPlaying(false); stopAnimation(); publishTime(Number(audioRef.current?.currentTime) || 0); }}
      onEnded={() => { setPlaying(false); stopAnimation(); publishTime(Number(audioRef.current?.currentTime) || 0); }}
    />

    <div className="rts-workspace">
      <div ref={scrollerRef} className="rts-scroller" onScroll={updateWindow} onClick={seek}>
        <div className="rts-inner">
          <div className="rts-ruler-row">
            <div className="rts-label rts-ruler-label">TIME</div>
            <div className="rts-ruler-track">
              {rulerTicks.map(tick => <span key={tick.time} className={`rts-tick ${tick.major ? "rts-tick-major" : ""}`} style={{ left: `${tick.time * pixelsPerSecond}px` }}>
                {tick.major && <span className="rts-tick-label">{formatTimelineTime(tick.time).slice(0, -4)}</span>}
              </span>)}
            </div>
          </div>
          <div className="rts-lanes">
            {lanes.map(lane => <div key={lane.id} className={`rts-lane rts-lane-${lane.kind ?? "default"} ${lane.className ?? ""}`} style={lane.height ? { "--rts-lane-height": `${lane.height}px` } as React.CSSProperties : undefined}>
              <div className="rts-label"><div className="rts-title">{lane.title}</div>{lane.meta && <div className="rts-meta">{lane.meta}</div>}</div>
              <div className="rts-track"><LaneContent content={lane.content} duration={duration} /></div>
            </div>)}
          </div>
          {grid.length > 0 && <div className="rts-grid" aria-hidden="true">{grid.map((marker: TimelineMarker, index) => <span key={`${marker.time}-${index}`} className={`rts-grid-line ${marker.emphasis ? "rts-grid-line-emphasis" : ""} ${marker.className ?? ""}`} style={{ left: `${marker.time * pixelsPerSecond}px` }} />)}</div>}
          <div className="rts-playhead" style={{ left: `${labelWidth + currentTime * pixelsPerSecond}px` }} aria-hidden="true" />
        </div>
      </div>
    </div>

    <footer className="rts-footer">
      <div>{footer}</div>
      <output className="rts-window">{formatTimelineTime(windowRange.start)} — {formatTimelineTime(windowRange.end)}</output>
    </footer>
  </section>;
}
