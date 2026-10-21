import { useMemo, useState } from "react";
import { lyricIntervals, lyricsAtTime } from "./lyrics";
import type { TimelineLane, TimelineLyricAudition } from "./types";

export function LyricAudition({ config, lanes, time, duration, playing }: {
  config: TimelineLyricAudition; lanes: readonly TimelineLane[];
  time: number; duration: number; playing: boolean;
}) {
  const lineLanes = lanes.filter(lane => lane.content.type === "timing" && lane.content.kind === "line");
  const [selection, setSelection] = useState<string | null>(null);
  const lane = lineLanes.find(item => item.id === (config.laneId ?? selection))
    ?? (config.laneId === undefined && selection === null ? lineLanes[0] : undefined);
  const items = config.items ?? (lane?.content.type === "timing" ? lane.content.items : []);
  const intervals = useMemo(() => lyricIntervals(items, duration), [items, duration]);
  const lines = lyricsAtTime(intervals, time);
  const [failedArtwork, setFailedArtwork] = useState<string | undefined>();
  const hasArtwork = config.artworkSrc && failedArtwork !== config.artworkSrc;

  return <aside className="rts-audition" aria-label="Lyric timing audition">
    <div className="rts-audition-heading">
      <strong>Lyric timing audition</strong>
      {config.audioLabel && <span className="rts-audition-source">{config.audioLabel}</span>}
      {config.items === undefined && config.laneId === undefined && lineLanes.length > 1 &&
        <label>Lyrics <select aria-label="Audition lyric lane" value={lane?.id ?? ""}
          onChange={event => setSelection(event.target.value)}>
          {!lane && <option value="">Choose lyric lane</option>}
          {lineLanes.map(item => <option key={item.id} value={item.id}>
            {typeof item.title === "string" ? item.title : item.id}
          </option>)}
        </select></label>}
    </div>
    <div className="rts-audition-cover">
      {hasArtwork ? <img src={config.artworkSrc} alt={config.artworkAlt ?? "Cover artwork"}
        onError={() => setFailedArtwork(config.artworkSrc)} />
        : <span className="rts-audition-no-art">Cover artwork unavailable</span>}
      <div className="rts-audition-subtitles" aria-label="Timed lyrics" aria-live="off">
        {lines.map((line, index) => <span key={index}>{line}</span>)}
      </div>
    </div>
    <output className="rts-audition-status" aria-live="off">
      {!intervals.some(item => item.text.trim()) ? "No timed lyrics available"
        : lines.length ? playing ? "Playing · timed lyrics" : "Paused · current lyrics"
        : "No lyric at this position"}
    </output>
  </aside>;
}
