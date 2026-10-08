# Loop regions and buffered playback

Available in version **0.2.0**. The loop API is optional and preserves the existing timeline and transport API.

## Use

```tsx
import { TimelineSequence, type TimelineLoop } from "react-timeline-sequence";
import "react-timeline-sequence/styles.css";

const loops: TimelineLoop[] = [{
  id: "verse-01-01",
  label: "Verse 1 · 4 bars",
  startSample: 480000,
  endSample: 864000,
  sampleRate: 48000,
  // Optional exact PCM excerpt of [480000, 864000), starting at excerpt time 0:
  audioSrc: "/audio/verse-01-01.wav",
  downloadUrl: "/audio/verse-01-01.wav",
}];

export function Example() {
  return <div style={{ height: "80vh" }}>
    <TimelineSequence
      audioSrc="/audio/master.wav"
      duration={120}
      lanes={[]}
      loops={loops}
      onLoopSelect={loop => console.log("selected", loop?.id)}
      onLoopEnabledChange={enabled => console.log("loop enabled", enabled)}
      onPlaybackError={error => console.error(error)}
    />
  </div>;
}
```

Selection and enabling are separate, internally managed states. Neither receiving
analysis results nor selecting a region automatically starts playback. Select a
region (or use the dropdown), enable it, then use the normal Play/Pause control.
Changing the selected loop during playback switches to the new loop's beginning.
Disabling looping resumes the master at the current song position when playing.
A paused seek remains paused. While looping, seeking wraps into the selected
region. Zoom to loop affects the same shared viewport as every other lane.

`onLoopSelect` and `onLoopEnabledChange` notify the host; they are not controlled
state setters. The callbacks are optional. Removing the selected region disables
it. Changing the source disposes pending requests, playback nodes and cached
loop audio. Use a React `key` when replacing an entire song/session.

## Sample contract

`startSample` is inclusive and `endSample` exclusive. Both are zero-based integer
**sample frames**, not interleaved stereo scalar indices, byte offsets, or samples
in a separator's resampled stem. `sampleRate` is the rate at which these indices
were measured. The example spans 10–18 seconds, or exactly 384,000 source frames.

With `audioSrc`, provide an exact excerpt of that interval as PCM/WAV. The excerpt
starts at its own time zero; its displayed playhead is translated back to the
master timeline. An excerpt whose decoded duration differs by more than 2 ms
(or two decoded samples, whichever is larger) is rejected. Do not use a lossy
encoder-padded excerpt. Without `audioSrc`, the component fetches/decodes the
master and sets Web Audio loop boundaries to the source-relative seconds.

Invalid indices, nonfinite sample rates, duplicate ids and regions outside a
known media duration are omitted. The dropdown remains available for overlapping
alternatives. The host supplies trustworthy annotations; this package does not
identify verses, detect vocals, find downbeats or make acoustic-safety claims.

## Playback and lifecycle

`LoopAudio` uses `AudioBufferSourceNode.loop`, `loopStart` and `loopEnd`.
Repetition is scheduled by the audio engine, not by a `timeupdate`, animation
frame, or JavaScript seek timer. Animation frames read the audio context clock
only to display the playhead. A delayed UI frame does not insert an audio gap.

The browser may resample decoded audio to its output sample rate. Source sample
numbers remain authoritative metadata; browser playback is timed in the decoded
Web Audio sample domain, not a promise of bit-exact source-rate DAC output.
Switching regions may pause to fetch/decode a new excerpt; **steady repeats** of
an already decoded region require no additional request or decoding.

AudioContext is created/resumed only when the user starts playback. Pending
fetches are aborted on pause/switch/dispose; generation checks prevent a slow
previous request from starting late. The one-entry buffer cache is keyed by the
URL and sample boundaries. Pausing stops the one-shot source node; resuming
creates a new node. Unmounting/source replacement closes the context. Network,
decode, resource-limit and autoplay failures are shown in the toolbar and sent
to `onPlaybackError`. There is no misleading imprecise seek-loop fallback.

The fetch/decode input limit is 128 MiB. Prefer excerpt URLs for long masters.
The browser still needs memory for decoded float audio. Fetch honors
`crossOrigin="use-credentials"` via `credentials: "include"`; configure CORS at
the audio server for cross-origin sources.

Public additions: `TimelineLoop`, `TimelineSequenceProps.loops`, the two callbacks,
`TIMELINE_LOOP_API_VERSION` (1), `loopRange`, `validLoops`, `wrapLoopTime`, `LoopAudio`.

## Build and test

```bash
npm ci
npm run typecheck
npm test
npm run build
node --test tests/loop-audio.node.mjs
npm pack --ignore-scripts
```

Install the resulting local tarball in StemLab before rebuilding its frontend:

```bash
# In StemLab, with the two repositories checked out as siblings:
npm ci
npm install --no-save --package-lock=false ../react-timeline-sequence/react-timeline-sequence-0.1.3.tgz
npm run build:web
```

This does not publish a package or change StemLab's package lock. A subsequent
`npm ci` reinstalls the released component: repeat the local tarball installation
before rebuilding until a version containing loop API v1 is actually published.
StemLab imports the capability constant so an old component fails the build
instead of silently ignoring loop props. Existing non-loop consumers need no API
changes.

The accompanying StemLab patch contains updated bundled frontend assets as well,
so they can be used immediately without rebuilding npm dependencies.

## Reference

[MDN: AudioBufferSourceNode.loop](https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode/loop)
describes engine-managed repetition and the loopStart/loopEnd contract.

## Patch validation

Nineteen engine tests were executed against the TypeScript-transpiled engine;
the real component was also exercised in Chromium inside StemLab's synthetic
workflow (repeat, switch, pause, seek and full-song restore). The standalone
Vitest/SSR tests are included but were not executed in the offline build
environment. Run the normal `npm run typecheck`, `npm test`, and `npm run build`
in your checkout, followed by `node --test tests/loop-audio.node.mjs`.
