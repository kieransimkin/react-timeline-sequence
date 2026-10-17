# Musical clocks and editable timing

`react-timeline-sequence` has optional fixed/variable 64-pip beat clocks and
editable timing lanes. All coordinates use **source audio seconds**; these
features never warp playback, rewrite analysis evidence or move cue timestamps
unless a user explicitly edits a cue.

## Fixed and variable tempo

```tsx
import {TimelineSequence, matchBeat, type TimelineBeatClock} from 'react-timeline-sequence';

const fixed: TimelineBeatClock = {mode: 'fixed', bpm: 120, firstBeatSeconds: .125};
const variable: TimelineBeatClock = {
  mode: 'variable', pips_per_beat: 64, origin_beat: 0,
  source_audio: {sample_rate: 8000, num_frames: 24000},
  beats: [{beat: 0, frame: 1000}, {beat: 1, frame: 5000},
    {beat: 2, frame: 9000}, {beat: 3, frame: 14160}],
};
const hit = matchBeat(variable, 1.1, .15);
// hit.time is the nearest original anchor; no invented beats in gaps.
```

Pass `beatClock={fixed}` or `beatClock={variable}` and `showBeatGrid` to
`TimelineSequence` for an optional beat overlay. Without those properties the
existing timeline remains unchanged. Fixed BPM is a mathematical grid, **not
inferred detected beats**; variable grids only render provided sample-frame
anchors. The helpers use 64 pips/beat and 16 DanceMoves ticks/beat.

## Editable lyric lines, words and cues

```tsx
<TimelineSequence audioSrc={audioUrl} duration={duration}
  beatClock={variable} showBeatGrid
  lanes={[{
    id: 'lyrics', title: 'Lyric lines',
    content: {type: 'timing', kind: 'line', editable: true, clock: variable,
      items: [{id: 'l1', start: .125, end: 1.125, label: 'No crown, no concrete'}],
      onEdit: updated => setLines(previous => previous.map(
        line => line.id === updated.id ? updated : line)),
    },
  }]}
/>
```

Change `kind` to `word` or `cue` for those tracks. Events have `id`, `start`,
optional `end`, `label`, and optional `parentId`. For words pass
`parents: [{id, start, end}]`; the editor constrains word times within their
selected line. Drags commit once on pointer-up; arrow keys nudge 10 ms or
1 ms with Shift. The consuming application owns persistence, undo and strict
cue-name conventions (Stemlab validates these server-side).

`onEdit` receives immutable edited events. `snap:true` with
`toleranceSeconds:.15` opts into matching *nearby* beats for user edits only;
it never snaps imported timings automatically. The pure, UI-independent helpers
`validateBeatClock`, `phasePipsAt`, `secondsAtPips`, `tempoAtSeconds`,
`matchBeat`, `beatGrid` and `editTimingEvent` are also exported. `matchBeat`
reports signed milliseconds as input time minus matched-anchor time.

The library does not assert any detector's musical correctness. Verify exact
master SHA-256, source-frame bounds, cue spelling and edit revisions in the
application before saving or publishing edited timings. It does not implement
new server endpoints or a new transport clock.
