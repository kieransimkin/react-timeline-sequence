import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url), ts=require('typescript');
const source=readFileSync(new URL('../src/display.ts',import.meta.url),'utf8');
const {outputText,diagnostics}=ts.transpileModule(source,{reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
assert.equal(diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error).length,0);
const d=await import('data:text/javascript;base64,'+Buffer.from(outputText).toString('base64'));
test('bounded per-channel height, invalid values use the default',()=>{
 assert.equal(d.laneHeight(0),128);assert.equal(d.laneHeight(10000),640);
 assert.equal(d.laneHeight(undefined),144);assert.equal(d.laneHeight(NaN),144);
 assert.equal(d.laneHeight(180.6),181);
});
test('wheel pixel, line and page deltas',()=>{
 assert.equal(d.wheelPixels(3,0,800),3);assert.equal(d.wheelPixels(3,1,800),48);
 assert.equal(d.wheelPixels(-1,2,800),-800);assert.equal(d.wheelPixels(Infinity,0,800),0);
});
test('time zoom is monotone and bounded',()=>{
 assert.ok(d.zoomAtPointer(40,-120)>40);assert.ok(d.zoomAtPointer(40,120)<40);
 assert.equal(d.zoomAtPointer(0,120),0);assert.equal(d.zoomAtPointer(100,-120),100);
});
test('height changes independently of horizontal scale',()=>{
 assert.ok(d.heightAtPointer(160,-120)>160);assert.ok(d.heightAtPointer(160,120)<160);
 assert.equal(d.heightAtPointer(640,-240),640);assert.equal(d.heightAtPointer(128,240),128);
});
test('requested view is remembered while missing data is displayed safely',()=>{
 assert.equal(d.effectiveAudioView('both',true,true),'both');
 assert.equal(d.effectiveAudioView('both',true,false),'waveform');
 assert.equal(d.effectiveAudioView('both',false,true),'spectrogram');
 assert.equal(d.effectiveAudioView('waveform',true,true),'waveform');
});
test('pointer anchored scrolling and start boundary',()=>{
 assert.equal(d.anchoredScroll(30,20,100),500);assert.equal(d.anchoredScroll(0,20,100),0);
});
