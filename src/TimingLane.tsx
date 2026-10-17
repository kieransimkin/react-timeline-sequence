/** Reusable, zoom-correct, keyboard-accessible timestamp editing lane.
 * No audio mutation; parent owns persistence and undo. Drag commits once.
 */
import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { matchBeat } from "./beatClock";
import { editTimingEvent, type TimingEdge, type TimingEvent, type TimingKind } from "./timingEdit";
import type { TimelineBeatClock } from "./beatClock";
import { formatTimelineTime } from "./time";

export interface TimingLaneProps {
  kind: TimingKind;
  items: readonly TimingEvent[];
  duration: number;
  clock?: TimelineBeatClock | null;
  snap?: boolean;
  toleranceSeconds?: number;
  editable?: boolean;
  selectedId?: string | null;
  /** Parented words stay inside these line ranges. */
  parents?: readonly {id: string; start: number; end: number}[];
  onSelect?: (id: string) => void;
  onEdit?: (item: TimingEvent) => void;
}

function itemBounds(item: TimingEvent, items: readonly TimingEvent[], props: TimingLaneProps) {
  const parent = item.parentId ? props.parents?.find(line => line.id === item.parentId) : null;
  const ordered = items.filter(row => row.id !== item.id && (row.parentId ?? "") === (item.parentId ?? ""))
    .sort((a, b) => a.start - b.start);
  const previous = ordered.filter(row => row.start <= item.start).slice(-1)[0];
  const next = ordered.find(row => row.start > item.start);
  return {
    duration: props.duration,
    bounds: parent ? {start: parent.start, end: parent.end} : undefined,
    previousEnd: previous ? previous.end ?? previous.start : undefined,
    nextStart: next?.start,
    clock: props.clock, snap: props.snap, toleranceSeconds: props.toleranceSeconds,
    minimumDuration: 0.001,
  };
}
export function TimingLane(props: TimingLaneProps) {
  const { items, kind, duration, clock, selectedId, onSelect, onEdit } = props;
  const editable = props.editable === true && typeof onEdit === "function";
  const [preview, setPreview] = useState<TimingEvent | null>(null);
  const pointer = useRef<{id: string; edge: TimingEdge; x: number; origin: TimingEvent; width: number} | null>(null);
  const live = useRef<TimingEvent | null>(null);
  const position = (seconds: number) => `${Math.max(0, Math.min(100, seconds * 100 / Math.max(duration, 1e-9)))}%`;
  function pointerDown(event: PointerEvent<HTMLButtonElement>, item: TimingEvent, edge: TimingEdge) {
    if (!editable || event.button !== 0) return;
    const track = event.currentTarget.closest<HTMLElement>(".rts-track");
    if (!track) return;
    const width = track.getBoundingClientRect().width;
    if (!Number.isFinite(width) || width <= 0) return;
    pointer.current = {id:item.id,edge,x:event.clientX,origin:item,width};
    live.current=item;
    event.currentTarget.setPointerCapture(event.pointerId);
    event.stopPropagation(); event.preventDefault();
    onSelect?.(item.id);
  }
  function pointerMove(event: PointerEvent<HTMLButtonElement>) {
    const drag = pointer.current;
    if (!drag || !editable) return;
    const wanted = drag.edge === "end" ? (drag.origin.end ?? drag.origin.start) : drag.origin.start;
    const next = wanted + (event.clientX - drag.x) * duration / drag.width;
    try {
      live.current = editTimingEvent(drag.origin,drag.edge,next,itemBounds(drag.origin,items,props));
      setPreview(live.current);
    } catch { /* Keep the last valid position until the pointer returns. */ }
    event.stopPropagation();
  }
  function pointerUp(event: PointerEvent<HTMLButtonElement>, cancelled = false) {
    const drag=pointer.current;
    if (!drag) return;
    pointer.current=null;
    if (!cancelled && live.current && onEdit &&
        (live.current.start !== drag.origin.start || live.current.end !== drag.origin.end)) onEdit(live.current);
    live.current=null;setPreview(null);event.stopPropagation();
  }
  function keyDown(event: KeyboardEvent<HTMLButtonElement>, item: TimingEvent, edge: TimingEdge) {
    if (!editable || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
    event.preventDefault();event.stopPropagation();
    const delta = (event.key === "ArrowRight" ? 1 : -1) * (event.shiftKey ? .001 : .01);
    const at = edge === "end" ? item.end ?? item.start : item.start;
    try { onEdit?.(editTimingEvent(item,edge,at+delta,itemBounds(item,items,props))); }
    catch { /* The last frame or neighbour is a hard boundary. */ }
  }
  return <div className={`rts-editable-timing rts-timing-${kind}`} role="group" aria-label={`${kind} timings`}>
    {items.filter(row => Number.isFinite(row.start) && row.start >= 0 && row.start <= duration).map(item => {
      const active = preview?.id === item.id ? preview : item;
      const width = active.end !== undefined ? Math.max(0.1,(active.end-active.start)*100/duration) : 0.12;
      const matched = clock ? matchBeat(clock,active.start,props.toleranceSeconds ?? .15) : null;
      const description = `${item.label} at ${formatTimelineTime(active.start)}${matched ?
        `, ${matched.withinTolerance ? "near" : "off"} ${matched.mode} beat ${matched.beat}, signed gap ${matched.errorMilliseconds.toFixed(1)} ms` : ""}`;
      return <div key={item.id} className={`rts-timing-region ${selectedId===item.id?"is-selected":""} ${item.className ?? ""}`}
        style={{left: position(active.start), width: `${width}%`}}>
        <button type="button" className={`rts-timing-handle rts-timing-main ${matched?.withinTolerance?"is-matched":""}`}
          aria-label={`Move ${description}`} title={description} aria-pressed={selectedId===item.id}
          onClick={event=>{event.stopPropagation();onSelect?.(item.id);}}
          onPointerDown={event=>pointerDown(event,item,"move")}
          onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={event=>pointerUp(event,true)}
          onKeyDown={event=>keyDown(event,item,"move")}>{item.label}</button>
        {editable && active.end !== undefined && <button type="button" className="rts-timing-end"
          aria-label={`Resize end of ${item.label}`} title="Resize end · arrows: 10 ms, Shift: 1 ms"
          onPointerDown={event=>pointerDown(event,item,"end")}
          onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={event=>pointerUp(event,true)}
          onKeyDown={event=>keyDown(event,item,"end")} />}
        {editable && active.end !== undefined && <button type="button" className="rts-timing-start"
          aria-label={`Resize start of ${item.label}`} title="Resize start · arrows: 10 ms, Shift: 1 ms"
          onPointerDown={event=>pointerDown(event,item,"start")}
          onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={event=>pointerUp(event,true)}
          onKeyDown={event=>keyDown(event,item,"start")} />}
      </div>;
    })}
  </div>;
}
