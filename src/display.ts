/** Display-only geometry. No audio samples or analysis values are changed. */
export const TIMELINE_DISPLAY_API_VERSION = 1;
export const MIN_LANE_HEIGHT = 128;
export const MAX_LANE_HEIGHT = 640;
export type AudioView = "waveform" | "spectrogram" | "both";
export function laneHeight(value: number | undefined, fallback = 144): number {
  return Math.max(MIN_LANE_HEIGHT, Math.min(MAX_LANE_HEIGHT,
    Number.isFinite(value) ? Math.round(value!) : fallback));
}
export function effectiveAudioView(requested: AudioView, wave: boolean, spec: boolean): AudioView {
  return !wave ? "spectrogram" : !spec ? "waveform" : requested;
}
export function wheelPixels(delta: number, mode: number, viewport: number): number {
  return Number.isFinite(delta) ? delta * (mode === 1 ? 16 : mode === 2 ? viewport : 1) : 0;
}
export function zoomAtPointer(zoom: number, delta: number): number {
  return Math.max(0, Math.min(100, zoom - Math.max(-240, Math.min(240, delta)) * .08));
}
export function heightAtPointer(height: number, delta: number): number {
  return laneHeight(height * Math.exp(-Math.max(-240, Math.min(240, delta)) * .002));
}
export function anchoredScroll(time: number, pixels: number, pointer: number): number {
  return Math.max(0, time * pixels - pointer);
}
