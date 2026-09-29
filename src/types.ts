import type { ReactNode } from "react";

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
  loops?: readonly TimelineLoop[];
  onLoopSelect?: (loop: TimelineLoop | null) => void;
  onLoopEnabledChange?: (enabled: boolean) => void;
  lanes: readonly TimelineLane[];
  title?: ReactNode;
  subtitle?: ReactNode;
  duration?: number;
  grid?: readonly TimelineMarker[];
  headerEnd?: ReactNode;
  footer?: ReactNode;
  className?: string;
  labelWidth?: number;
  initialZoom?: number;
  followPlayheadByDefault?: boolean;
  preload?: "none" | "metadata" | "auto";
  crossOrigin?: "anonymous" | "use-credentials";
  onDurationChange?: (duration: number) => void;
  onTimeChange?: (time: number) => void;
  onWindowChange?: (window: TimelineWindow) => void;
  onPlaybackError?: (error: unknown) => void;
}
