# react-timeline-sequence

A reusable React control for audio playback against one shared horizontal timeline. It keeps the transport, playhead, seeking, fit/zoom, follow mode, ruler and lane geometry together while allowing the host application to supply its own sequence data.

It was extracted from [StemLab](https://github.com/kieransimkin/stemlab), but it has no StemLab, backend or audio-analysis dependency.

## Loops (unreleased patch)

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

Until an npm release is published, install the GitHub repository directly:

```bash
npm install github:kieransimkin/react-timeline-sequence#v0.1.1
```

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

CI runs the type check, tests and production build, then retains an installable package artifact. Publishing a GitHub release sends the verified package to npmjs and GitHub Packages and attaches the tarball and checksum to the release.

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
