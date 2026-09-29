// Run after npm run build: node --test tests/loop-audio.node.mjs
// A module override lets offline QA execute the identical transpiled engine.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
const { LoopAudio, loopRange, validLoops, wrapLoopTime } = await import(
  process.env.TIMELINE_LOOP_MODULE || new URL('../dist/index.js', import.meta.url).href
);
const originalFetch=globalThis.fetch;
let requests, context;
function fakeContext() {
  context = { currentTime:0, destination:{}, duration:2, nodes:[], closed:false,
    resume:async()=>{},close:async()=>{context.closed=true;},
    decodeAudioData:async()=>({duration:context.duration,sampleRate:48000}),
    createBufferSource(){const node={loop:false,loopStart:0,loopEnd:0,started:null,stopped:false,
      connect(){},disconnect(){},start(...args){this.started=args;},stop(){this.stopped=true;}};
      this.nodes.push(node); return node;},
  };
  return context;
}
const loop={id:'verse',label:'Verse',startSample:441000,endSample:529200,sampleRate:44100,audioSrc:'/verse.wav'};
beforeEach(()=>{requests=[];globalThis.fetch=async(url,options)=>{requests.push({url,options});return new Response(new ArrayBuffer(16));};});
afterEach(()=>{globalThis.fetch=originalFetch;});

test('native sample units and exclusive end',()=>assert.deepEqual(loopRange(loop),{start:10,end:12,duration:2}));
test('invalid and duplicate loops excluded',()=>assert.deepEqual(validLoops([loop,loop,{...loop,id:'bad',endSample:0}]),[loop]));
test('loop beyond duration excluded',()=>assert.equal(validLoops([loop],11).length,0));
test('sample indices must be integers',()=>assert.throws(()=>loopRange({...loop,startSample:1.5}),RangeError));
test('negative index rejected',()=>assert.throws(()=>loopRange({...loop,startSample:-1}),RangeError));
test('wrap handles multiple cycles and negative seeks',()=>{assert.equal(wrapLoopTime(18.5,10,12),10.5);assert.equal(wrapLoopTime(9,10,12),11);});
test('actual Web Audio loop flags, not timer seeking',async()=>{
 const player=new LoopAudio(fakeContext);assert.equal(await player.play(loop,'/master',10),true);
 const node=context.nodes[0];assert.equal(node.loop,true);assert.equal(node.loopStart,0);assert.equal(node.loopEnd,2);assert.deepEqual(node.started,[0,0]);
 context.currentTime=8.5;assert.equal(player.currentTime,10.5);player.dispose();
});
test('original audio fallback uses master-relative bounds',async()=>{
 const player=new LoopAudio(()=>{fakeContext();context.duration=20;return context;});
 await player.play({...loop,audioSrc:undefined},'/master',10.5);
 assert.equal(context.nodes[0].loopStart,10);assert.equal(context.nodes[0].loopEnd,12);assert.deepEqual(context.nodes[0].started,[0,10.5]);player.dispose();
});
test('pause freezes time and stops the node',async()=>{
 const p=new LoopAudio(fakeContext);await p.play(loop,'/',10);context.currentTime=3.5;
 assert.equal(p.pause(),11.5);context.currentTime=20;assert.equal(p.currentTime,11.5);assert.equal(context.nodes[0].stopped,true);p.dispose();
});
test('resume reuses buffer but creates a fresh one-shot source node',async()=>{
 const p=new LoopAudio(fakeContext);await p.play(loop,'/',10);p.pause();await p.play(loop,'/',11);
 assert.equal(requests.length,1);assert.equal(context.nodes.length,2);assert.equal(context.nodes[1].started[1],1);p.dispose();
});
test('same URL with changed boundaries invalidates buffer cache',async()=>{
 const p=new LoopAudio(fakeContext);await p.play(loop,'/',10);await p.play({...loop,startSample:88200,endSample:176400},'/',2);
 assert.equal(requests.length,2);p.dispose();
});
test('dispose stops sources and closes the context',async()=>{
 const p=new LoopAudio(fakeContext);await p.play(loop,'/',10);p.dispose();assert.equal(context.closed,true);assert.equal(context.nodes[0].stopped,true);
});
test('pending request cannot start after pause',async()=>{
 let resolve;globalThis.fetch=()=>new Promise(r=>{resolve=r;});
 const p=new LoopAudio(fakeContext);const pending=p.play(loop,'/',10);p.pause();resolve(new Response(new ArrayBuffer(4)));
 assert.equal(await pending,false);assert.equal(context.nodes.length,0);p.dispose();
});
test('stale first selection cannot replace a newer one',async()=>{
 let resolve;let count=0;globalThis.fetch=()=>++count===1?new Promise(r=>{resolve=r;}):Promise.resolve(new Response(new ArrayBuffer(4)));
 const p=new LoopAudio(fakeContext);const old=p.play(loop,'/',10);
 await p.play({...loop,id:'chorus',audioSrc:'/chorus'},'/',10);resolve(new Response(new ArrayBuffer(4)));
 assert.equal(await old,false);assert.equal(context.nodes.length,1);assert.equal(p.playing,true);p.dispose();
});
test('network error surfaces',async()=>{
 globalThis.fetch=async()=>new Response('',{status:404});const p=new LoopAudio(fakeContext);
 await assert.rejects(p.play(loop,'/',10),/HTTP 404/);assert.equal(p.playing,false);p.dispose();
});
test('incorrect excerpt duration is not silently looped',async()=>{
 const p=new LoopAudio(()=>{fakeContext();context.duration=3;return context;});
 await assert.rejects(p.play(loop,'/',10),/duration/);p.dispose();
});
test('oversized audio rejected before decode',async()=>{
 globalThis.fetch=async()=>new Response('',{headers:{'Content-Length':String(129*1024*1024)}});
 const p=new LoopAudio(fakeContext);await assert.rejects(p.play(loop,'/',10),/128 MiB/);p.dispose();
});
test('credentials are explicit for cross-origin sources',async()=>{
 const p=new LoopAudio(fakeContext);await p.play(loop,'/',10,'include');assert.equal(requests[0].options.credentials,'include');p.dispose();
});

test('zero-duration decode never starts a zero-length loop',async()=>{
 const p=new LoopAudio(()=>{fakeContext();context.duration=0;return context;});
 await assert.rejects(p.play({...loop,startSample:0,endSample:1},'/',0),/duration/);
 assert.equal(context.nodes.length,0);p.dispose();
});
