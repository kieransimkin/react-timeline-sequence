import { useCallback, useLayoutEffect, useEffect, useMemo, useRef, useState } from "react";
import { AudioLane } from "./AudioLane";
import { laneHeight, wheelPixels, zoomAtPointer, heightAtPointer, anchoredScroll, effectiveAudioView,
  MIN_LANE_HEIGHT, MAX_LANE_HEIGHT, type AudioView } from "./display";
import { loopRange, validLoops } from "./LoopAudio";
import { useTimelineTransport } from "./useTimelineTransport";
import { LaneContent } from "./LaneContent";
import { chooseRulerStep, clamp, formatTimelineTime, visibleTimelineWindow } from "./time";
import { beatGrid as renderBeatGrid } from "./beatClock";
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
  for (let index = 0; index * minor <= duration + 1e-6; index += 1) {
    ticks.push({
      time: index * minor,
      major: index % 5 === 0,
    });
  }
  return ticks;
}

function rulerLabel(time: number, pixelsPerSecond: number): string {
  const milliseconds = Math.round(time * 1000);
  const seconds = Math.floor(milliseconds / 1000);
  const whole = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  return chooseRulerStep(pixelsPerSecond) < 1
    ? `${whole}.${String(milliseconds % 1000).padStart(3, "0")}` : whole;
}

export function TimelineSequence({
  audioSrc,
  loops = [],
  onLoopSelect,
  onLoopEnabledChange,
  lanes,
  title = "Audio timeline",
  subtitle,
  duration: durationHint = 0,
  grid = [],
  beatClock = null,
  showBeatGrid = false,
  headerEnd,
  footer,
  className = "",
  labelWidth = 230,
  initialZoom = 20,
  laneControls = false,
  wheelNavigation = false,
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
  const [duration, setDuration] = useState(Math.max(0, durationHint));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const availableLoops = useMemo(() => validLoops(loops, duration), [loops, duration]);
  const selectedLoop = availableLoops.find(loop => loop.id === selectedId) ?? null;
  const activeLoop = loopEnabled ? selectedLoop : null;
  const transport = useTimelineTransport(audioRef, audioSrc, activeLoop, onPlaybackError,
    crossOrigin === "use-credentials" ? "include" : "same-origin");
  const currentTime = transport.time;
  const isPlaying = transport.playing;
  const selectedRange = selectedLoop ? loopRange(selectedLoop) : null;

  const selectLoop = (id: string) => {
    setSelectedId(id);
    onLoopSelect?.(availableLoops.find(loop => loop.id === id) ?? null);
  };
  const enableLoop = (enabled: boolean) => {
    setLoopEnabled(enabled);
    onLoopEnabledChange?.(enabled);
  };
  useEffect(() => {
    if (selectedId && !availableLoops.some(loop => loop.id === selectedId)) {
      setSelectedId(null);
      setLoopEnabled(false);
      onLoopSelect?.(null);
      onLoopEnabledChange?.(false);
    }
  }, [selectedId, availableLoops, onLoopSelect, onLoopEnabledChange]);
  useEffect(() => {
    setSelectedId(null);
    setLoopEnabled(false);
    setDuration(Math.max(0, durationHint));
  }, [audioSrc]);
  const [follow, setFollow] = useState(followPlayheadByDefault);
  const [zoom, setZoom] = useState(initialZoom);
  const [laneHeights, setLaneHeights] = useState<Record<string, number>>({});
  const [laneViews, setLaneViews] = useState<Record<string, AudioView>>({});
  const zoomRef = useRef(initialZoom);
  const pendingAnchor = useRef<{time: number; pointer: number} | null>(null);
  const wheelHandler = useRef<(event: WheelEvent) => void>(() => {});
  useEffect(() => { setLaneHeights({}); setLaneViews({}); }, [audioSrc]);
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
  useLayoutEffect(() => {
    zoomRef.current = zoom;
    if (pendingAnchor.current && scrollerRef.current) {
      const {time, pointer} = pendingAnchor.current;
      scrollerRef.current.scrollLeft = anchoredScroll(time, pixelsPerSecond, pointer);
      pendingAnchor.current = null;
    }
  }, [zoom, pixelsPerSecond]);
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !wheelNavigation) return;
    const onWheel = (event: WheelEvent) => wheelHandler.current(event);
    scroller.addEventListener("wheel", onWheel, {passive:false});
    return () => scroller.removeEventListener("wheel", onWheel);
  }, [wheelNavigation]);
  const trackWidth = Math.max(1, duration * pixelsPerSecond);
  const rulerTicks = useMemo(() => createRulerTicks(duration, pixelsPerSecond), [duration, pixelsPerSecond]);
  const musicalGrid = useMemo(() => beatClock && showBeatGrid ?
    renderBeatGrid(beatClock, 0, duration, 2000).map(point => ({time:point.time,emphasis:point.emphasis,label:point.label,
      className:`rts-beat-grid-${beatClock.mode}`})) : [], [beatClock,showBeatGrid,duration]);
  const visualGrid = [...grid, ...musicalGrid];

  const updateWindow = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    // Sticky labels cover the first labelWidth pixels even after scrolling.
    const next = visibleTimelineWindow(scroller.scrollLeft + labelWidth,
      Math.max(0, scroller.clientWidth - labelWidth), labelWidth, pixelsPerSecond, duration);
    setWindowRange(next);
    onWindowChange?.(next);
  }, [duration, labelWidth, onWindowChange, pixelsPerSecond]);

  useEffect(() => {
    updateWindow();
  }, [updateWindow, viewportWidth]);

  useEffect(() => {
    onTimeChange?.(currentTime);
    const scroller = scrollerRef.current;
    if (!scroller || !follow || !isPlaying) return;
    const x = labelWidth + currentTime * pixelsPerSecond;
    const right = scroller.scrollLeft + scroller.clientWidth;
    const margin = Math.min(180, scroller.clientWidth * 0.2);
    if (x > right - margin) scroller.scrollLeft = Math.max(0, x - scroller.clientWidth + margin);
    else if (x < scroller.scrollLeft + labelWidth) scroller.scrollLeft = Math.max(0, x - labelWidth - margin);
  }, [currentTime, follow, isPlaying, labelWidth, onTimeChange, pixelsPerSecond]);

  const seek = (event: React.MouseEvent<HTMLDivElement>) => {
    if (duration <= 0 || (event.target as HTMLElement).closest(".rts-label, a, button, input, select, textarea")) return;
    const scroller = scrollerRef.current;
    const audio = audioRef.current;
    if (!scroller || !audio) return;
    const rect = scroller.getBoundingClientRect();
    const contentX = event.clientX - rect.left + scroller.scrollLeft - labelWidth;
    if (contentX < 0) return;
    const next = clamp(contentX / pixelsPerSecond, 0, duration);
    transport.seek(next);
  };

  const changeZoom = (next: number, clientX?: number) => {
    const scroller = scrollerRef.current;
    next = clamp(next, 0, 100);
    if (next === zoomRef.current) return;
    if (scroller) {
      const available = Math.max(1, scroller.clientWidth - labelWidth);
      const pointer = clientX === undefined ? available / 2
        : clamp(clientX - scroller.getBoundingClientRect().left - labelWidth, 0, available);
      // Use the pending scale for a burst of wheel events, retaining the same
      // musical instant under the cursor across the React layout update.
      const prior = pendingAnchor.current;
      const scale = fitPixelsPerSecond * Math.pow(2, zoomRef.current / 18);
      const left = prior ? anchoredScroll(prior.time, scale, prior.pointer) : scroller.scrollLeft;
      pendingAnchor.current = {time:(left + pointer) / scale, pointer};
    }
    zoomRef.current = next;
    setZoom(next);
  };
  wheelHandler.current = (event: WheelEvent) => {
    const scroller = scrollerRef.current;
    const target = event.target instanceof Element ? event.target : null;
    if (!scroller || !target || target.closest("input, select, textarea, button, [contenteditable=true]")) return;
    const raw = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    const delta = wheelPixels(raw, event.deltaMode, scroller.clientWidth - labelWidth);
    if (!delta) return;
    if (event.ctrlKey || event.metaKey) {
      if (duration <= 0) return;
      event.preventDefault(); event.stopPropagation(); setFollow(false);
      changeZoom(zoomAtPointer(zoomRef.current, delta), event.clientX);
    } else if (event.altKey) {
      const id = target.closest<HTMLElement>("[data-lane-id]")?.dataset.laneId;
      const lane = lanes.find(item => item.id === id);
      if (!laneControls || !lane) return;
      event.preventDefault(); event.stopPropagation();
      setLaneHeights(previous => ({...previous,
        [lane.id]:heightAtPointer(previous[lane.id] ?? laneHeight(lane.height), delta)}));
    } else {
      event.preventDefault(); event.stopPropagation();
      if (event.shiftKey) scroller.scrollTop += delta;
      else {setFollow(false); scroller.scrollLeft += delta;}
    }
  };

  const focusLoop = () => {
    if (!selectedRange || !scrollerRef.current) return;
    const wanted = Math.max(320, viewportWidth - labelWidth - 16) / (selectedRange.duration * 1.1);
    const nextZoom = clamp(18 * Math.log2(wanted / fitPixelsPerSecond), 0, 100);
    pendingAnchor.current = null;
    zoomRef.current = nextZoom;
    setZoom(nextZoom);
    const nextPixels = fitPixelsPerSecond * Math.pow(2, nextZoom / 18);
    requestAnimationFrame(() => {
      if (scrollerRef.current) scrollerRef.current.scrollLeft = Math.max(0, (selectedRange.start - selectedRange.duration * .05) * nextPixels);
    });
  };

  const handleMetadata = () => {
    const mediaDuration = Number(audioRef.current?.duration) || 0;
    if (Number.isFinite(mediaDuration) && mediaDuration > 0) {
      setDuration(mediaDuration);
      onDurationChange?.(mediaDuration);
    }
  };

  return <section
    className={`rts-sequence ${laneControls ? "rts-display-controls" : ""} ${className}`}
    style={{ "--rts-label-width": `${labelWidth}px`, "--rts-track-width": `${trackWidth}px` } as React.CSSProperties}
  >
    <header className="rts-toolbar">
      <div className="rts-ident">
        <strong>{title}</strong>
        {subtitle && <span>{subtitle}</span>}
      </div>
      <div className="rts-transport" aria-label="Timeline playback controls">
        <button type="button" className="rts-button rts-play" onClick={transport.toggle} aria-label={isPlaying || transport.loading ? "Pause" : "Play"}>{transport.loading ? "…" : isPlaying ? "❚❚" : "▶"}</button>
        <output className="rts-time" aria-live="off">{formatTimelineTime(currentTime)} / {formatTimelineTime(duration)}</output>
        <button type="button" className="rts-button" onClick={() => changeZoom(0)}>Fit</button>
        <label className="rts-control"><span>Zoom</span><input aria-label="Timeline zoom" type="range" min="0" max="100" value={zoom} onChange={event => changeZoom(Number(event.target.value))} /></label>
        <label className="rts-control"><input type="checkbox" checked={follow} onChange={event => setFollow(event.target.checked)} /><span>Follow</span></label>
      </div>
      <div className="rts-header-end">{headerEnd}</div>
      {availableLoops.length > 0 && <div className="rts-loop-controls" aria-label="Loop controls">
        <label>Loop <select aria-label="Select loop" value={selectedId ?? ""} onChange={event => selectLoop(event.target.value)}>
          <option value="">Choose a loop…</option>
          {availableLoops.map(loop => <option key={loop.id} value={loop.id}>{loop.label || loop.id}</option>)}
        </select></label>
        <label><input type="checkbox" aria-label="Enable loop" disabled={!selectedLoop} checked={loopEnabled && !!selectedLoop} onChange={event => enableLoop(event.target.checked)} />Enable loop</label>
        <button type="button" className="rts-button" disabled={!selectedLoop} onClick={focusLoop}>Zoom to loop</button>
        {selectedLoop && <output>{selectedLoop.startSample.toLocaleString()} → {selectedLoop.endSample.toLocaleString()} samples (end exclusive) · {selectedLoop.sampleRate.toLocaleString()} Hz</output>}
        {selectedLoop?.downloadUrl && <a href={selectedLoop.downloadUrl} download>Download loop WAV</a>}
        <span className="rts-loop-status" role="status">{transport.loading ? "Loading loop…" : loopEnabled && selectedLoop ? "Loop enabled · Play repeats selection" : "Full-song playback"}</span>
      </div>}
      {transport.error && <div role="alert" className="rts-loop-error">{transport.error}</div>}
    </header>

    <audio
      ref={audioRef}
      src={audioSrc}
      preload={preload}
      crossOrigin={crossOrigin}
      onLoadedMetadata={handleMetadata}
      onEnded={transport.ended}
      onError={() => transport.fail(new Error(audioRef.current?.error?.message || "Audio playback failed"))}
    />

    <div className="rts-workspace">
      <div ref={scrollerRef} className="rts-scroller" onScroll={updateWindow} onClick={seek}>
        <div className="rts-inner">
          <div className="rts-ruler-row">
            <div className="rts-label rts-ruler-label">TIME</div>
            <div className="rts-ruler-track">
              {rulerTicks.map(tick => <span key={tick.time} className={`rts-tick ${tick.major ? "rts-tick-major" : ""}`} style={{ left: `${tick.time * pixelsPerSecond}px` }}>
                {tick.major && <span className="rts-tick-label">{rulerLabel(tick.time, pixelsPerSecond)}</span>}
              </span>)}
            </div>
          </div>
          {availableLoops.length > 0 && <div className="rts-lane rts-lane-loops">
            <div className="rts-label"><div className="rts-title">LOOPS</div><div className="rts-meta">Select a region, enable, then Play</div></div>
            <div className="rts-track">{availableLoops.map(loop => {
              const range = loopRange(loop);
              return <button type="button" key={loop.id} className="rts-loop-region" aria-pressed={selectedId === loop.id}
                aria-label={`Select ${loop.label || loop.id}`} onClick={() => selectLoop(loop.id)}
                title={`${loop.label || loop.id}: [${loop.startSample}, ${loop.endSample}) at ${loop.sampleRate} Hz`}
                style={{ left: `${range.start * pixelsPerSecond}px`, width: `${range.duration * pixelsPerSecond}px` }}>{loop.label || loop.id}</button>;
            })}</div>
          </div>}
          {selectedRange && <div className={`rts-loop-shade ${loopEnabled ? "" : "is-disabled"}`} aria-hidden="true"
            style={{ left: `${labelWidth + selectedRange.start * pixelsPerSecond}px`, width: `${selectedRange.duration * pixelsPerSecond}px` }} />}
          <div className="rts-lanes">
            {lanes.map(lane => {
              const content = lane.content;
              const audio = content.type === "audio" ? content : null;
              const requested = laneViews[lane.id] ?? audio?.view ?? "both";
              const view = audio ? effectiveAudioView(requested, !!audio.waveform, !!audio.spectrogram) : "both";
              const height = laneControls ? laneHeights[lane.id] ?? laneHeight(lane.height) : lane.height;
              const label = typeof lane.title === "string" ? lane.title : lane.id;
              return <div key={lane.id} data-lane-id={lane.id}
                className={`rts-lane rts-lane-${lane.kind ?? "default"} ${lane.className ?? ""}`}
                style={height ? {"--rts-lane-height":`${height}px`} as React.CSSProperties : undefined}>
                <div className="rts-label"><div className="rts-title">{lane.title}</div>
                  {lane.meta && <div className="rts-meta">{lane.meta}</div>}
                  {laneControls && <div className="rts-lane-controls">
                    {audio && <label>View <select aria-label={`View for ${label}`} value={view}
                      onChange={event => setLaneViews(previous => ({...previous, [lane.id]:event.target.value as AudioView}))}>
                      <option value="waveform" disabled={!audio.waveform}>Waveform</option>
                      <option value="spectrogram" disabled={!audio.spectrogram}>Spectrogram</option>
                      <option value="both" disabled={!audio.waveform || !audio.spectrogram}>Both</option>
                    </select></label>}
                    <label>Height <input type="range" min={MIN_LANE_HEIGHT} max={MAX_LANE_HEIGHT} step="1"
                      aria-label={`Height for ${label}`} value={height}
                      onChange={event => setLaneHeights(previous => ({...previous,[lane.id]:laneHeight(Number(event.target.value))}))}/>
                      <output>{height}px</output></label>
                    <button type="button" className="rts-height-reset" aria-label={`Reset height for ${label}`}
                      onClick={() => setLaneHeights(previous => ({...previous,[lane.id]:laneHeight(lane.height)}))}>Reset height</button>
                  </div>}
                </div>
                <div className="rts-track">{audio ? <AudioLane content={audio} duration={duration} view={view}/>
                  : <LaneContent content={content} duration={duration}/>}</div>
              </div>;
            })}
          </div>
          {visualGrid.length > 0 && <div className="rts-grid" aria-hidden="true">{visualGrid.map((marker: TimelineMarker, index) => <span key={`${marker.time}-${index}`} className={`rts-grid-line ${marker.emphasis ? "rts-grid-line-emphasis" : ""} ${marker.className ?? ""}`} style={{ left: `${marker.time * pixelsPerSecond}px` }} />)}</div>}
          <div className="rts-playhead" style={{ left: `${labelWidth + currentTime * pixelsPerSecond}px` }} aria-hidden="true" />
        </div>
      </div>
    </div>

    <footer className="rts-footer">
      <div>{footer}{wheelNavigation && <div className="rts-navigation-help">
        Wheel: time · Ctrl/⌘ + wheel: time zoom · Alt + wheel: channel height · Shift + wheel: channel scroll
      </div>}</div>
      <output className="rts-window">{formatTimelineTime(windowRange.start)} — {formatTimelineTime(windowRange.end)}</output>
    </footer>
  </section>;
}
