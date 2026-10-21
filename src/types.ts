import type { ReactNode } from "react";
import type { TimelineBeatClock } from "./beatClock";
import type { TimingEvent, TimingKind } from "./timingEdit";

export interface TimelineMarker {
  time: number;
  label?: string;
  emphasis?: boolean;
  className?: string;
}

export interface TimelineBlock {
  start: number;
  end?: number;
  label?: string;
  title?: string;
  className?: string;
}

export interface TimelineNote extends TimelineBlock {
  value: number;
}

export interface TimelinePoint {
  time: number;
  value: number;
}

export interface TimelineSummaryItem {
  label: string;
  value: ReactNode;
}

export type TimelineLaneContent =
  | { type: "audio"; waveform?: { min: readonly number[]; max: readonly number[]; colour?: string };
      spectrogram?: { src: string; alt: string }; view?: "waveform" | "spectrogram" | "both" }
  | { type: "waveform"; min: readonly number[]; max: readonly number[]; colour?: string }
  | { type: "image"; src: string; alt: string; className?: string }
  | { type: "markers"; items: readonly TimelineMarker[] }
  | { type: "blocks"; items: readonly TimelineBlock[] }
  | { type: "notes"; items: readonly TimelineNote[] }
  | { type: "curve"; points: readonly TimelinePoint[]; colour?: string }
  | { type: "matrix"; rows: readonly (readonly number[])[] }
  | { type: "summary"; items: readonly TimelineSummaryItem[] }
  | { type: "artifact"; href?: string; note: ReactNode; linkLabel?: string }
  | { type: "text"; text: string }
  | { type: "timing"; kind: TimingKind; items: readonly TimingEvent[];
      clock?: TimelineBeatClock | null; snap?: boolean; toleranceSeconds?: number; editable?: boolean;
      selectedId?: string | null; parents?: readonly {id:string;start:number;end:number}[];
      onSelect?: (id:string)=>void; onEdit?: (item:TimingEvent)=>void }
  | { type: "custom"; node: ReactNode };

export interface TimelineLane {
  id: string;
  title: ReactNode;
  meta?: ReactNode;
  kind?: string;
  className?: string;
  height?: number;
  content: TimelineLaneContent;
}

export interface TimelineWindow {
  start: number;
  end: number;
}

/** Lyrics use seconds on the same source timeline as audioSrc and loop playback. */
export interface TimelineLyricAudition {
  artworkSrc?: string;
  artworkAlt?: string;
  /** Exact line lane to preview. Omit to select among kind:'line' timing lanes. */
  laneId?: string;
  /** Host-adapted lines, e.g. parsed LRC. Overrides lane selection when supplied. */
  items?: readonly TimelineBlock[];
  /** Name of the selected audio channel supplied through audioSrc. */
  audioLabel?: ReactNode;
  enabledByDefault?: boolean;
}

/** Source sample frames; endSample is EXCLUSIVE. audioSrc, when present, is an exact
 * PCM/WAV excerpt of this region (not the full master or an encoder-padded MP3). */
export interface TimelineLoop {
  id: string;
  label?: string;
  startSample: number;
  endSample: number;
  sampleRate: number;
  audioSrc?: string;
  downloadUrl?: string;
}

export interface TimelineSequenceProps {
  audioSrc: string;
  /** Opt-in cover-art subtitle audition using the existing shared transport. */
  lyricAudition?: TimelineLyricAudition;
  loops?: readonly TimelineLoop[];
  onLoopSelect?: (loop: TimelineLoop | null) => void;
  onLoopEnabledChange?: (enabled: boolean) => void;
  lanes: readonly TimelineLane[];
  title?: ReactNode;
  subtitle?: ReactNode;
  duration?: number;
  grid?: readonly TimelineMarker[];
  /** Optional exact source-frame variable or fixed-BPM grid/beat-matching model. */
  beatClock?: TimelineBeatClock | null;
  /** OFF by default; old pages retain their original visual grid. */
  showBeatGrid?: boolean;
  headerEnd?: ReactNode;
  footer?: ReactNode;
  className?: string;
  labelWidth?: number;
  initialZoom?: number;
  /** Opt-in per-lane height and composite audio view controls. */
  laneControls?: boolean;
  /** Wheel pans time; Ctrl/Meta zooms time, Alt resizes a lane, Shift pans lanes. */
  wheelNavigation?: boolean;
  followPlayheadByDefault?: boolean;
  preload?: "none" | "metadata" | "auto";
  crossOrigin?: "anonymous" | "use-credentials";
  onDurationChange?: (duration: number) => void;
  onTimeChange?: (time: number) => void;
  onWindowChange?: (window: TimelineWindow) => void;
  onPlaybackError?: (error: unknown) => void;
}
