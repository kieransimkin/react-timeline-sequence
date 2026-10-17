# Editable semantic keyframe timing lane

`react-timeline-sequence` can display an opt-in `kind: 'keyframe'` timing
lane in addition to the existing lyric line, word and cue timing lanes.
It uses the **same** zoom-correct pointer drag, selection, keyboard nudge,
beat snap and immutable `onEdit` callback. The host app owns numeric values,
property ranges, easing, timebase conversion, undo/redo, persistence and
validation. The component never treats keyframe labels as structural cues.

```tsx
import {TimelineSequence, type TimelineLane} from 'react-timeline-sequence';
const lane:TimelineLane={id:'mesh-displacement',title:'Mesh displacement',
  content:{type:'timing',kind:'keyframe',editable:true,
    items:[{id:'k0',start:0,label:'0.25'}, {id:'k1',start:2.5,label:'0.80'}],
    onEdit: key=>updateHostKeyframe(key)}};
<TimelineSequence audioSrc="rendered-excerpt.wav" duration={12}
  lanes={[lane]} />;
```

The authoring application remains responsible for mapping output-time
positions to FrameRudiments' normalized `layer_animations` envelopes and
for creating preview frames through its own backend. Existing packages using
`line`, `word` or `cue` are unaffected; the new lane is additive and opt-in.
