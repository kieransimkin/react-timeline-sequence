import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TimelineSequence } from "../src/TimelineSequence";

describe("TimelineSequence", () => {
  it("renders accessible playback controls and lane metadata", () => {
    const markup = renderToStaticMarkup(<TimelineSequence
      audioSrc="/song.mp3"
      duration={120}
      title="Example song"
      subtitle="sha256"
      lanes={[{
        id: "beats",
        title: "Beats",
        meta: "detected events",
        content: { type: "markers", items: [{ time: 1 }, { time: 2, emphasis: true }] },
      }]}
    />);
    expect(markup).toContain("Timeline playback controls");
    expect(markup).toContain("Example song");
    expect(markup).toContain("detected events");
    expect(markup).toContain("aria-label=\"Play\"");
  });
});
