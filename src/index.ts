import "./styles.css";
import "./loops.css";
import "./display.css";
import "./timing.css";
import "./lyrics.css";
export { TIMELINE_LYRIC_AUDITION_API_VERSION, lyricIntervals, lyricsAtTime, lyricLineStatesAtTime } from "./lyrics";
export type { LyricInterval, LyricLineState, LyricWordState } from "./lyrics";
export { TIMELINE_DISPLAY_API_VERSION, MAX_TIMELINE_ZOOM } from "./display";

export { TIMELINE_LOOP_API_VERSION, loopRange, LoopAudio, validLoops, wrapLoopTime } from "./LoopAudio";

export { TimelineSequence } from "./TimelineSequence";
export { clamp, chooseRulerStep, formatTimelineTime, visibleTimelineWindow } from "./time";
export type {
  TimelineBlock,
  TimelineLoop,
  TimelineLyricLine,
  TimelineLyricWord,
  TimelineLane,
  TimelineLyricAudition,
  TimelineLaneContent,
  TimelineMarker,
  TimelineNote,
  TimelinePoint,
  TimelineSequenceProps,
  TimelineSummaryItem,
  TimelineWindow,
} from "./types";

// Opt-in BPM/phase and editable lyric/word/cue tracks.
export { PIPS_PER_BEAT, TICKS_PER_BEAT, validateBeatClock, phasePipsAt, secondsAtPips,
  tempoAtSeconds, matchBeat, beatGrid } from "./beatClock";
export { editTimingEvent } from "./timingEdit";
export { TimingLane } from "./TimingLane";
export type { FixedBeatClock, VariableBeatClock, TimelineBeatClock, BeatMatch } from "./beatClock";
export type { TimingEvent, TimingEditOptions, TimingKind, TimingEdge } from "./timingEdit";
