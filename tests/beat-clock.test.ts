import { describe, expect, it } from 'vitest';
import {beatGrid,matchBeat,phasePipsAt,secondsAtPips,tempoAtSeconds,validateBeatClock,type TimelineBeatClock} from '../src/beatClock';
const fixed:TimelineBeatClock={mode:'fixed',bpm:120,firstBeatSeconds:.125,offsetPips:-16};
const variable:TimelineBeatClock={mode:'variable',pips_per_beat:64,source_audio:{sample_rate:8000,num_frames:24000},origin_beat:0,
 beats:[{beat:0,frame:1000},{beat:1,frame:5000},{beat:2,frame:9000},{beat:3,frame:14160}]};
describe('fixed and sample-frame variable BPM matching',()=>{
 it('cross-checks fixed offset and exact first beat',()=>{expect(validateBeatClock(fixed)).toBe(fixed);expect(phasePipsAt(fixed,.125)).toBe(0);expect(secondsAtPips(fixed,64)).toBeCloseTo(.625);expect(tempoAtSeconds(fixed,1.1)).toBe(120);expect(matchBeat(fixed,.63,.15).withinTolerance).toBe(true);});
 it('tracks irregular intervals, including phase before beat zero',()=>{expect(validateBeatClock(variable)).toBe(variable);expect(tempoAtSeconds(variable,1.14)).toBeCloseTo(60/.645);expect(phasePipsAt(variable,0)).toBeCloseTo(-16);expect(secondsAtPips(variable,192)).toBeCloseTo(1.77);expect(matchBeat(variable,1.77,.15).beat).toBe(3);});
 it('only matches actual observed variable anchors, no invented missing beats',()=>{const gap={...variable,beats:[{beat:0,frame:1000},{beat:4,frame:9000}]};expect(matchBeat(gap, .625).withinTolerance).toBe(false);expect(beatGrid(gap,0,2)).toHaveLength(2);});
 it('bounds display grid and rejects inconsistent offsets/anchors',()=>{expect(beatGrid(fixed,0,100,4).length).toBeLessThanOrEqual(4);expect(()=>validateBeatClock({...fixed,offsetPips:-15})).toThrow();expect(()=>validateBeatClock({...variable,beats:[...variable.beats].reverse()})).toThrow();});
});
