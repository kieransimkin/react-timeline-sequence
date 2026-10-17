import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect} from 'vitest';
import {TimelineSequence} from '../src/TimelineSequence';
import type {TimingKind} from '../src/timingEdit';

const kind:TimingKind='keyframe';
describe('reusable 3D/compositor keyframe lane',()=>{
 it('renders an accessible draggable keyframe timing track',()=>{
  const html=renderToStaticMarkup(<TimelineSequence audioSrc="/sample.wav" duration={12}
    lanes={[{id:'opacity',title:'Layer opacity',content:{type:'timing',kind,editable:true,
      items:[{id:'key-0',start:1.25,label:'0.75',className:'keyframe'}],onEdit:()=>{}}}]} />);
  expect(html).toContain('keyframe timings');
  expect(html).toContain('rts-timing-keyframe');
  expect(html).toContain('Move 0.75');
 });
});
