import { useEffect, useRef } from "react";
import type { TimelineLaneContent, TimelineNote } from "./types";
import { clamp, formatTimelineTime } from "./time";

interface LaneContentProps {
  content: TimelineLaneContent;
  duration: number;
}

function position(time: number, duration: number): string {
  return `${clamp(time / Math.max(duration, 1e-9), 0, 1) * 100}%`;
}

function width(start: number, end: number | undefined, duration: number, fallback = 0.08): string {
  const safeEnd = Number.isFinite(end) && Number(end) > start ? Number(end) : start + 0.5;
  return `${Math.max(fallback, ((safeEnd - start) / Math.max(duration, 1e-9)) * 100)}%`;
}

function Waveform({ min, max, colour = "#79c0ff" }: Extract<TimelineLaneContent, { type: "waveform" }>) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const points = Math.max(1, Math.min(min.length, max.length));
    canvas.width = points;
    canvas.height = 180;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, points, canvas.height);
    context.strokeStyle = colour;
    context.lineWidth = 1;
    context.beginPath();
    const midpoint = canvas.height / 2;
    const scale = canvas.height * 0.46;
    for (let index = 0; index < points; index += 1) {
      const x = index + 0.5;
      context.moveTo(x, midpoint - (Number(max[index]) || 0) * scale);
      context.lineTo(x, midpoint - (Number(min[index]) || 0) * scale);
    }
    context.stroke();
  }, [colour, max, min]);
  return <canvas ref={ref} className="rts-waveform" aria-hidden="true" />;
}

function Matrix({ rows }: Extract<TimelineLaneContent, { type: "matrix" }>) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const usableRows = rows.filter(row => row.length > 0);
    if (!canvas || !usableRows.length) return;
    const bins = Math.max(...usableRows.map(row => row.length));
    canvas.width = Math.min(4096, usableRows.length);
    canvas.height = Math.min(256, bins);
    const context = canvas.getContext("2d");
    if (!context) return;
    const image = context.createImageData(canvas.width, canvas.height);
    for (let x = 0; x < canvas.width; x += 1) {
      const sourceX = Math.min(usableRows.length - 1, Math.floor(x * usableRows.length / canvas.width));
      const values = usableRows[sourceX];
      const localMax = Math.max(1e-9, ...values.map(value => Number(value) || 0));
      for (let y = 0; y < canvas.height; y += 1) {
        const bin = Math.min(values.length - 1, Math.floor((canvas.height - 1 - y) * values.length / canvas.height));
        const value = clamp((Number(values[bin]) || 0) / localMax, 0, 1);
        const pixel = (y * canvas.width + x) * 4;
        image.data[pixel] = Math.round(40 + 180 * value);
        image.data[pixel + 1] = Math.round(35 + 110 * value);
        image.data[pixel + 2] = Math.round(80 + 170 * value);
        image.data[pixel + 3] = 255;
      }
    }
    context.putImageData(image, 0, 0);
  }, [rows]);
  return <canvas ref={ref} className="rts-matrix" aria-hidden="true" />;
}

function Notes({ items, duration }: { items: readonly TimelineNote[]; duration: number }) {
  const valid = items.filter(item => Number.isFinite(item.value) && item.value > 0);
  if (!valid.length) return null;
  const minLog = Math.log2(Math.max(20, Math.min(...valid.map(item => item.value))));
  const maxLog = Math.log2(Math.max(100, ...valid.map(item => item.value)));
  return valid.map((item, index) => {
    const normalised = (Math.log2(item.value) - minLog) / Math.max(0.01, maxLog - minLog);
    return <span
      key={`${item.start}-${index}`}
      className={`rts-note ${item.className ?? ""}`}
      style={{ left: position(item.start, duration), width: width(item.start, item.end ?? item.start + 0.12, duration, 0.04), top: `${8 + (1 - normalised) * 72}px` }}
      title={item.title ?? `${item.label ?? `${item.value.toFixed(1)} Hz`} · ${formatTimelineTime(item.start)}`}
    />;
  });
}

export function LaneContent({ content, duration }: LaneContentProps) {
  switch (content.type) {
    case "waveform":
      return <Waveform {...content} />;
    case "image":
      return <img className={`rts-image ${content.className ?? ""}`} src={content.src} alt={content.alt} />;
    case "markers":
      return <>{content.items.map((item, index) => <span
        key={`${item.time}-${index}`}
        className={`rts-marker ${item.emphasis ? "rts-marker-emphasis" : ""} ${item.className ?? ""}`}
        style={{ left: position(item.time, duration) }}
        title={item.label}
      />)}</>;
    case "blocks":
      return <>{content.items.map((item, index) => <span
        key={`${item.start}-${index}`}
        className={`rts-block ${item.className ?? ""}`}
        style={{ left: position(item.start, duration), width: width(item.start, item.end, duration) }}
        title={item.title ?? `${item.label ?? ""} · ${formatTimelineTime(item.start)}${item.end ? ` — ${formatTimelineTime(item.end)}` : ""}`}
      >{item.label}</span>)}</>;
    case "notes":
      return <Notes items={content.items} duration={duration} />;
    case "curve": {
      const points = content.points.filter(point => Number.isFinite(point.time) && Number.isFinite(point.value));
      if (!points.length) return null;
      const values = points.map(point => point.value);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const coordinates = points.map(point => {
        const x = point.time / Math.max(duration, 1e-9) * 2000;
        const y = 180 - ((point.value - min) / Math.max(1e-9, max - min)) * 168 - 6;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      }).join(" ");
      return <svg className="rts-curve" viewBox="0 0 2000 180" preserveAspectRatio="none" aria-hidden="true">
        <polyline fill="none" stroke={content.colour ?? "#7ee787"} strokeWidth="2" vectorEffect="non-scaling-stroke" points={coordinates} />
      </svg>;
    }
    case "matrix":
      return <Matrix {...content} />;
    case "summary":
      return <div className="rts-summary">{content.items.map((item, index) => <span className="rts-summary-item" key={`${item.label}-${index}`}><strong>{item.label}: </strong>{item.value}</span>)}</div>;
    case "artifact":
      return <div className="rts-artifact"><span>{content.note}</span>{content.href && <a href={content.href} target="_blank" rel="noopener noreferrer">{content.linkLabel ?? "open"}</a>}</div>;
    case "text":
      return <div className="rts-text">{content.text}</div>;
    case "custom":
      return <>{content.node}</>;
  }
}
