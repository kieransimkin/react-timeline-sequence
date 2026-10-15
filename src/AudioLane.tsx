import { LaneContent } from "./LaneContent";
import { effectiveAudioView, type AudioView } from "./display";
import type { TimelineLaneContent } from "./types";

type AudioContent = Extract<TimelineLaneContent, { type: "audio" }>;
export function AudioLane({content, duration, view}: {content: AudioContent; duration: number; view: AudioView}) {
  const mode = effectiveAudioView(view, !!content.waveform, !!content.spectrogram);
  return <div className={`rts-audio-layers rts-audio-${mode}`} data-audio-view={mode}>
    {content.spectrogram && mode !== "waveform" && <div className="rts-audio-spectrum">
      <LaneContent content={{type:"image", ...content.spectrogram}} duration={duration}/>
    </div>}
    {content.waveform && mode !== "spectrogram" && <div className="rts-audio-envelope">
      <LaneContent content={{type:"waveform", ...content.waveform, colour:mode === "both" ? "#e6fff7" : content.waveform.colour}} duration={duration}/>
    </div>}
    {!content.waveform && !content.spectrogram && <span className="rts-meta">Waiting for audio analysis</span>}
  </div>;
}
