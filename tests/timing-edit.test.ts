import {describe,it,expect} from 'vitest';
import {editTimingEvent} from '../src/timingEdit';
import {type TimelineBeatClock} from '../src/beatClock';
const clock:TimelineBeatClock={mode:'fixed',bpm:120,firstBeatSeconds:.125};
const word={id:'word-1',parentId:'line-1',start:.4,end:.55,label:'world'};
describe('editable timestamps',()=>{
 it('drags words only inside the parent line',()=>{expect(editTimingEvent(word,'move',99,{duration:3,bounds:{start:.25,end:.75}})).toMatchObject({start:.6,end:.75});});
 it('snaps by request, never by default',()=>{expect(editTimingEvent(word,'move',.61,{duration:3,clock,snap:false}).start).toBe(.61);expect(editTimingEvent(word,'move',.62,{duration:3,clock,snap:true}).start).toBeCloseTo(.625);});
 it('rejects impossible parent durations',()=>{expect(()=>editTimingEvent(word,'start',.72,{duration:3,bounds:{start:.7,end:.75},minimumDuration:.2})).toThrow();});
 it('keeps all other event fields and respects neighbours',()=>{let v=editTimingEvent(word,'move',.05,{duration:3,previousEnd:.32});expect(v.start).toBe(.32);expect(v.label).toBe(word.label);expect(v.parentId).toBe(word.parentId);});
});
