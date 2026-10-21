import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { TimelineSequence, type TimelineLane, type TimingEvent } from "../../src/index";

// Original synthetic fixture: no song, private artwork or external requests.
function tone(frequency: number): string {
  const rate = 16000, seconds = 12, buffer = new ArrayBuffer(44 + rate * seconds * 2), view = new DataView(buffer);
  const text = (offset: number, value: string) => [...value].forEach((char, i) => view.setUint8(offset + i, char.charCodeAt(0)));
  text(0,"RIFF"); view.setUint32(4,buffer.byteLength-8,true); text(8,"WAVE"); text(12,"fmt "); view.setUint32(16,16,true);
  view.setUint16(20,1,true); view.setUint16(22,1,true); view.setUint32(24,rate,true); view.setUint32(28,rate*2,true);
  view.setUint16(32,2,true); view.setUint16(34,16,true); text(36,"data"); view.setUint32(40,rate*seconds*2,true);
  for(let i=0;i<rate*seconds;i++) view.setInt16(44+i*2,Math.sin(i/rate*frequency*Math.PI*2)*1200,true);
  return URL.createObjectURL(new Blob([buffer],{type:"audio/wav"}));
}
function Demo() {
  const sources = useMemo(() => [tone(220),tone(440)], []);
  useEffect(() => () => sources.forEach(URL.revokeObjectURL), [sources]);
  const [channel, setChannel] = useState(0);
  const [cover, setCover] = useState(true);
  const [time, setTime] = useState(0);
  const [items, setItems] = useState<TimingEvent[]>([
    {id:"one",start:1,end:3,label:"Follow the light"},
    {id:"two",start:4,end:6,label:"Across the quiet sky"},
    {id:"three",start:7,end:10,label:"A longer line to check subtitle wrapping on the cover artwork"},
  ]);
  const lanes: TimelineLane[] = [{id:"master",title:channel ? "Channel B · 440 Hz" : "Channel A · 220 Hz",
    content:{type:"waveform",min:[-.2,-.5,-.3,-.7,-.4],max:[.3,.6,.4,.8,.5]}},
    {id:"lyrics",title:"Line timings",content:{type:"timing",kind:"line",items,editable:true,
      onEdit:item=>setItems(previous=>previous.map(old=>old.id===item.id?item:old))}},
    {id:"alternative",title:"Alternative lyrics",content:{type:"timing",kind:"line",
      items:[{id:"alt",start:1,end:3,label:"Alternative line"}]}}];
  return <main>
    <h1>Audition lyric timings</h1><p>Original synthetic tones, test text and vector artwork · no campaign media</p>
    <div className="demo-controls">
      <label>Audio channel <select aria-label="Audio channel" value={channel} onChange={e=>setChannel(Number(e.target.value))}>
        <option value={0}>Channel A · 220 Hz</option><option value={1}>Channel B · 440 Hz</option></select></label>
      <label><input type="checkbox" checked={cover} onChange={e=>setCover(e.target.checked)}/>Cover available</label>
      <button onClick={()=>setItems(old=>old.map(item=>item.id==="one"?{...item,start:2}:item))}>Move first lyric to 2s</button>
      <output data-testid="source-time">{time.toFixed(3)}</output>
    </div>
    <div className="demo-timeline"><TimelineSequence audioSrc={sources[channel]} duration={12} lanes={lanes}
      title="Lyric timing audition" subtitle="Seek the timeline or edit a line, then press Play"
      onTimeChange={setTime} labelWidth={155} initialZoom={0}
      lyricAudition={{artworkSrc:cover?"./cover.svg":undefined,artworkAlt:"Original vector illustration of mountains beneath a moon",
        audioLabel:channel?"Channel B · 440 Hz":"Channel A · 220 Hz"}}
      loops={[{id:"phrase",label:"First phrase",startSample:16000,endSample:48000,sampleRate:16000}]}/></div>
  </main>;
}
const style = document.createElement("style");
style.textContent = `body{margin:0;background:#090d16;color:#e8edf8;font-family:Inter,system-ui}main{padding:20px}h1{font-size:26px;margin:0 0 8px}p{color:#9aaac1;font-size:13px}.demo-controls{display:flex;flex-wrap:wrap;gap:16px;align-items:center;margin:18px 0}select,button{padding:6px;background:#1a2230;color:#fff;border:1px solid #536078;border-radius:5px}.demo-timeline{height:650px;min-height:520px;border:1px solid #2c3446}@media(max-width:640px){main{padding:8px}.demo-timeline{height:720px}h1{font-size:22px}}`;
document.head.append(style);
createRoot(document.getElementById("root")!).render(<Demo/>);
