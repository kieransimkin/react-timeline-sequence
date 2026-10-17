# react-timeline-sequence

[![React Timeline Sequence logo](https://raw.githubusercontent.com/kieransimkin/react-timeline-sequence/v0.2.1/docs/branding/logo.png)](https://kieransimkin.co.uk/danceflow/)

By **[Kieran Simkin](https://kieransimkin.co.uk/)** · [DanceFlow ecosystem](https://kieransimkin.co.uk/danceflow/) · [Vector logo and usage guide](docs/branding/README.md).

React audio timeline and transport with sequence lanes, seeking, zoom and sample-frame loops. https://kieransimkin.co.uk/


A reusable React control for audio playback against one shared horizontal timeline. It keeps the transport, playhead, seeking, fit/zoom, follow mode, ruler and lane geometry together while allowing the host application to supply its own sequence data.

It was extracted from [StemLab](https://github.com/kieransimkin/stemlab), but it has no StemLab, backend or audio-analysis dependency.


## Agents and contributors

Agents using React Timeline Sequence should inspect its available capabilities, use them fully where they fit the task, and look for useful improvements wherever possible. When a required feature is missing, or a reusable reliability, usability, performance or documentation gap is found, improve this tool rather than maintaining a separate workaround. If no worthwhile change is justified, explain why.

Submit every improvement as a pull request to [react-timeline-sequence](https://github.com/kieransimkin/react-timeline-sequence/pulls), with relevant tests, documentation and a reproducible example. Follow [CONTRIBUTING.md](CONTRIBUTING.md) and [AGENTS.md](AGENTS.md) for the contribution and validation workflow.

Project website: [https://kieransimkin.co.uk/danceflow/](https://kieransimkin.co.uk/danceflow/).

## Editable keyframe lanes

Use `content.type = 'timing'` with `kind: 'keyframe'` for visual-property
keyframes. The same keyboard nudging, drag and optional beat-snap logic
continues to work with lyric, word and cue lanes. Persistence and validation
are the consuming application's responsibility.

See [the keyframe lane guide](docs/keyframe-lane.md).
## Loop regions and buffered playback

Supply `loops` to add sample-based regions, a loop selector, an enable switch,
Zoom to loop, and buffered repeat playback through the same transport/playhead.
Looping is off until the user selects and enables a region. See
[the loop API and integration guide](docs/loops.md) for the sample contract,
resource lifecycle, examples and tests. Existing callers without `loops` retain
normal full-song playback.

## Install

```bash
npm install react-timeline-sequence
```

Install the latest stable version published on npm; tagged GitHub source remains available for inspection.

React and React DOM 18 or later are peer dependencies.

Published releases are also mirrored to GitHub Packages as `@kieransimkin/react-timeline-sequence`. See [the publishing guide](docs/publishing.md) for registry setup and release details.

## Use

```tsx
import { TimelineSequence, type TimelineLane } from "react-timeline-sequence";
import "react-timeline-sequence/styles.css";

const lanes: TimelineLane[] = [
  {
    id: "waveform",
    title: "Master",
    meta: "waveform",
    content: {
      type: "waveform",
      min: [-0.2, -0.6, -0.1],
      max: [0.3, 0.7, 0.2],
    },
  },
  {
    id: "sections",
    title: "Sections",
    content: {
      type: "blocks",
      items: [
        { start: 0, end: 12.5, label: "Intro" },
        { start: 12.5, end: 42, label: "Verse" },
      ],
    },
  },
];

export function SongTimeline() {
  return <TimelineSequence
    audioSrc="/audio/song.mp3"
    duration={180}
    title="Song title"
    lanes={lanes}
  />;
}
```

The containing element must have a useful height. The control fills that height and keeps the ruler and lane labels visible while the timeline scrolls.

## Lane content

The built-in lane renderers cover:

- min/max waveform envelopes;
- aligned images such as spectrogram strips;
- beat and cue markers;
- labelled regions, words and structural sections;
- frequency-positioned note blocks;
- curves and matrix data;
- summary chips, text and artifact links;
- custom React nodes for application-specific content.

Lane items use seconds on the shared media timeline. The new `TimelineLoop` contract uses native source sample frames, converted using its explicit sample rate. The host remains responsible for loading and validating data; the control does not fetch analysis files or assume an API.

## Styling

Import `react-timeline-sequence/styles.css`. Colours can be changed on the control or an ancestor with CSS custom properties:

```css
.my-timeline {
  --rts-bg: #0b1020;
  --rts-accent: #9ef01a;
  --rts-accent-2: #48cae4;
  --rts-playhead: #ff4d6d;
}
```

The package uses `rts-` class names so its layout does not depend on host styles.

## Development

```bash
npm ci
npm run typecheck
npm test
npm run build
```

The build emits ESM, CommonJS, TypeScript declarations and one CSS file under `dist/`.

CI runs the type check, tests and production build, then retains an installable package artifact. Pushing a fresh matching `vX.Y.Z` tag starts the Release workflow: it attaches the tested tarball/checksum to the GitHub release and publishes to npmjs and GitHub Packages. Verify all jobs and registry versions, not just the release card.

## Scope

This project owns the reusable timeline and media transport only. Uploads, persistence, streaming protocols, analysis jobs and domain-specific conversion into lanes belong to the consuming application.

## Potential problems

### The timeline has no usable height

- **Symptom:** the toolbar appears but the lanes are collapsed or missing.
- **Cause:** the component fills its containing block; CSS percentage heights cannot resolve without a height in the ancestor chain.
- **Correction:** give the immediate container a fixed, viewport or grid-resolved height.
- **Verification:** the workspace is visible and scrolls independently beneath the toolbar.
- **Limit:** the package does not choose an application-level page height.

### Audio plays but cross-origin media fails in some hosts

- **Symptom:** playback or media metadata loading fails only when audio is served from another origin.
- **Cause:** the media server and the component's `crossOrigin` setting do not agree.
- **Correction:** configure the server's CORS response and pass `crossOrigin="anonymous"` or `"use-credentials"` as appropriate.
- **Verification:** the browser loads metadata and playback starts without a media/CORS error.
- **Limit:** the package cannot change response headers on the audio host.

## Licence

MIT © Kieran Simkin.

## Composite audio lanes and display navigation

Enable `laneControls` and `wheelNavigation` on `TimelineSequence` to expose
per-channel presentation controls. They are opt-in so existing hosts keep their
normal scrolling unless they explicitly enable this interaction scheme.

```tsx
<TimelineSequence audioSrc="song.mp3" duration={180} laneControls wheelNavigation
  lanes={[{id: "master", title: "Master", kind: "audio", height: 160,
    content: {type: "audio", view: "both",
      waveform: {min: [-.2, -.5], max: [.3, .7]},
      spectrogram: {src: "master-spectrum.png", alt: "Master spectrogram"}}}]} />
```

The spectrogram must be a time-aligned strip without plot axes, margins or
legends. **Both** draws that image behind a contrasting translucent waveform;
**Waveform** and **Spectrogram** select either layer alone. Unavailable layers
are disabled, not fabricated. The host supplies the same media extent for both.

Every heading has a height slider and Reset height button. Heights are bounded
to 128–640 CSS pixels; the default is 144 pixels unless the lane supplies its own
height. These controls resize the lane, not sample values or audio gain. Settings
are independent by lane ID, survive a refreshed lane inventory, and reset when
`audioSrc` changes. They are not persisted across page reloads.

Over the timeline track or heading (outside input controls):

| Gesture | Action |
| --- | --- |
| Wheel | Pan forward/backward through time without seeking playback. |
| Ctrl/Command + wheel | Zoom time, anchored at the time under the pointer. |
| Alt + wheel | Resize only the lane under the pointer. |
| Shift + wheel | Scroll vertically between channels. |

Ctrl/Command takes precedence when modifiers are combined. Pan/time zoom turns
off Follow so playback does not immediately undo manual navigation. The global
zoom slider and Fit remain available; scrollbars, heading sliders and keyboard
controls remain usable. Wheel interception is confined to this component and
leaves form controls alone. No gesture starts, pauses or seeks the transport.

`TIMELINE_DISPLAY_API_VERSION === 1` is exported for consuming applications that
need a strict capability check before building a static viewer.


## Coordinated releases and latest-release dependencies

Keep `DanceRudiments`, `react-timeline-sequence`, and `stemlab` as sibling
checkouts. The release order is **React Timeline Sequence → DanceRudiments →
StemLab**: publish and verify the companions before updating the consuming app.
StemLab must use their **latest stable official releases**, not an unreleased
commit, sibling source package or vendored npm archive. Each build records exact
released versions/commits/integrity after latest-release resolution so all its
jobs use the same bytes; CI fails clearly when that snapshot is stale.

From the parent folder, preview and then explicitly execute:

```powershell
.\stemlab\scripts\Release-DanceFlow.ps1 -ProjectsRoot .
.\stemlab\scripts\Release-DanceFlow.ps1 -ProjectsRoot . -Execute
```

For the first migration use the same commands with
`.\release-kit\Release-DanceFlow.ps1` after extracting the complete kit. It
applies the three repository patches, updates versions, performs scoped commits
and normal pushes, waits for exact-commit CI, then creates **new** release tags.
The existing GitHub Actions workflows publish packages; no protection rules,
credentials, old tags or assets are changed. The initial expected next-minor
versions are only a preview proposal, never a claim that they are published.

Use Node.js 24, Python 3.11+, PowerShell 5.1+, Git and authenticated GitHub CLI.
Required main/registry/Pages jobs must pass; missing approvals and partial
publication are blockers, not success. The default script releases all three
projects, is opt-in via `-Execute`, and supports a saved exact-source `-Resume`
session. A changed checkout or pre-commit build failure requires review rather
than an automatic stash/reset or guessed recovery.

StemLab's helper updates npm manifests/lock, optional native dependency minimum,
release/build metadata and the genuinely rebuilt JS/CSS together. Its daily
release-update workflow proposes subsequent updates by PR without auto-merging.
A tagged StemLab release generates all four Arcadians pages and validates actual
Pages deployment, live HTML and seekable audio. Do not start a duplicate manual
Arcadians analysis during that tagged build. Read
**[the full release, resume, verification and troubleshooting guide](docs/released-viewers.md)**
before running it. Keep this README and AGENTS.md synchronized with future changes.

## Sample-frame BPM matching and editable timing lanes (v0.4)

`react-timeline-sequence` accepts an **optional** `beatClock` and `showBeatGrid`
prop. Older timelines do not change: the overlay is off by default. Fixed
clocks require `{mode:'fixed', bpm:120, firstBeatSeconds:0.125}` (optionally
also `offsetPips:-16`). Variable clocks accept Stemlab's exact sample-frame
beat anchors with `{mode:'variable', pips_per_beat:64,
source_audio:{sample_rate:48000}, origin_beat:0, beats:[{beat:0,frame:6000},...]}`.
`validateBeatClock`, `phasePipsAt`, `secondsAtPips`, `tempoAtSeconds`,
`matchBeat`, and `beatGrid` are side-effect-free exports. Variable matching
uses real anchor frames, not a fabricated constant-BPM beat at a gap.

Use the new `content.type='timing'` lane for editable line, word or cue
boundaries. The callbacks are opt-in; existing marker/block/loop tracks stay
unchanged. Example:

```tsx
const lane = {
  id:'lyrics', title:'Line timings',
  content:{type:'timing',kind:'line',editable:true,
    clock:{mode:'fixed',bpm:120,firstBeatSeconds:.125},snap:false,
    items:[{id:'line-1',start:1.25,end:2.5,label:'Hello world'}],
    onEdit: event => saveLocally(event), onSelect:id=>setSelected(id)}
};
<TimelineSequence audioSrc="/song.mp3" lanes={[lane]}
  beatClock={{mode:'fixed',bpm:120,firstBeatSeconds:.125}}
  showBeatGrid />
```

Pointer drags commit once on release. Keyboard arrows move by 10 ms, or
Shift+arrow by 1 ms. End handles resize the interval. Parent bounds constrain
word motion inside its line. Optional snapping uses a configurable tolerance
(default 150 ms), without automatically modifying off-grid events. The parent
component owns validation, undo, source identity, file exports and persistence.
An invalid editor operation never changes the underlying audio.
