"""Bounded browser regression and genuine UI captures for the synthetic demo.

Requires Python Playwright and Chromium/Edge. Start the loopback Vite demo first.
Example: python scripts/check-lyric-audition.py --browser /path/to/chromium
"""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser()
parser.add_argument("--browser")
parser.add_argument("--url", default="http://127.0.0.1:5197/examples/lyric-audition/")
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
media = root / "docs/media"
work = root / ".release-test"
media.mkdir(exist_ok=True)
errors = []
results = {}

with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=args.browser, headless=True, args=["--disable-gpu"])
    context = None
    try:
        context = browser.new_context(viewport={"width":1440,"height":1000},
            record_video_dir=str(work / "video"), record_video_size={"width":1440,"height":1000})
        page = context.new_page()
        video = page.video
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(args.url, wait_until="domcontentloaded", timeout=90000)
        print("Demo document loaded", flush=True)
        page.wait_for_function("document.querySelector('audio').readyState >= 1")
        print("Audio metadata ready", flush=True)
        captions = page.get_by_label("Timed lyrics", exact=True)

        def seek(seconds):
            # Click the actual waveform track, scrolling the shared scroller when needed.
            scroller = page.locator(".rts-scroller")
            track = page.locator('[data-lane-id="master"] .rts-track')
            scroller.evaluate("el => el.scrollLeft = 0")
            box = track.bounding_box()
            viewport = scroller.bounding_box()
            x = box["x"] + box["width"] * seconds / 12
            if x > viewport["x"] + viewport["width"] - 5:
                scroller.evaluate("(el, x) => el.scrollLeft = x", x - viewport["x"] - viewport["width"] + 20)
                box = track.bounding_box()
                x = box["x"] + box["width"] * seconds / 12
            page.mouse.click(x, box["y"] + box["height"] / 2)
            # Pointer positions are CSS-pixel quantized; exact interval boundaries
            # are covered separately by the pure regression tests.
            page.wait_for_function("seconds => Math.abs(Number(document.querySelector('[data-testid=source-time]').textContent) - seconds) < .03", arg=seconds)

        expect(captions).to_have_text("")
        seek(1.5)
        expect(captions).to_have_text("Follow the light")
        page.screenshot(path=str(media / "lyric-audition-desktop.png"), full_page=True)
        page.get_by_role("button", name="Play", exact=True).click()
        page.wait_for_function("document.querySelector('audio').currentTime > 1.7 && !document.querySelector('audio').paused")
        expect(captions).to_have_text("Follow the light")
        page.wait_for_function("document.querySelector('audio').currentTime > 3.05")
        expect(captions).to_have_text("")
        page.get_by_role("button", name="Pause", exact=True).click()
        results["real_audio_play_and_gap"] = True
        page.wait_for_function("document.querySelector('audio').paused")
        page.wait_for_timeout(60)
        paused = page.get_by_test_id("source-time").inner_text()
        page.wait_for_timeout(200)
        assert page.get_by_test_id("source-time").inner_text() == paused
        seek(4.5)
        expect(captions).to_have_text("Across the quiet sky")
        seek(1.5)
        page.get_by_role("button", name="Move first lyric to 2s").click()
        expect(captions).to_have_text("")
        seek(2.5)
        expect(captions).to_have_text("Follow the light")
        results["paused_seek_and_live_timing_edit"] = True
        page.get_by_label("Audition lyric lane").select_option("alternative")
        expect(captions).to_have_text("Alternative line")
        page.get_by_label("Audition lyric lane").select_option("lyrics")
        results["lyric_lane_selection"] = True

        page.get_by_role("button", name="Play", exact=True).click()
        page.wait_for_function("!document.querySelector('audio').paused")
        old_source = page.locator("audio").get_attribute("src")
        page.get_by_label("Audio channel", exact=True).select_option("1")
        page.wait_for_function("document.querySelector('audio').currentTime === 0 && document.querySelector('audio').paused")
        assert page.locator("audio").get_attribute("src") != old_source
        expect(captions).to_have_text("")
        expect(page.locator(".rts-audition-source")).to_have_text("Channel B · 440 Hz")
        seek(4.5)
        page.get_by_role("button", name="Play", exact=True).click()
        page.wait_for_function("document.querySelector('audio').currentTime > 4.6 && !document.querySelector('audio').paused")
        expect(captions).to_have_text("Across the quiet sky")
        page.get_by_role("button", name="Pause", exact=True).click()
        results["selected_channel_switch_stops_previous_and_plays_new_source"] = True

        page.get_by_label("Select loop", exact=True).select_option("phrase")
        page.get_by_label("Enable loop", exact=True).check()
        page.get_by_role("button", name="Play", exact=True).click()
        expect(page.get_by_role("button", name="Pause", exact=True)).to_be_visible()
        page.wait_for_function("Number(document.querySelector('[data-testid=source-time]').textContent) > 2.2")
        expect(captions).to_have_text("Follow the light")
        page.wait_for_function("Number(document.querySelector('[data-testid=source-time]').textContent) < 1.5")
        expect(captions).to_have_text("")
        page.get_by_role("button", name="Pause", exact=True).click()
        page.get_by_label("Enable loop", exact=True).uncheck()
        results["buffered_loop_wrap_uses_original_source_time"] = True

        page.get_by_label("Audition lyrics", exact=True).uncheck()
        expect(captions).to_have_count(0)
        assert page.locator("audio").count() == 1
        page.get_by_label("Audition lyrics", exact=True).check()
        seek(4.5)
        page.get_by_label("Cover available", exact=True).uncheck()
        expect(page.get_by_text("Cover artwork unavailable", exact=True)).to_be_visible()
        expect(captions).to_have_text("Across the quiet sky")
        page.get_by_label("Cover available", exact=True).check()
        results["toggle_and_missing_art_keep_single_transport"] = True

        for width, name in [(900,"tablet"),(390,"mobile")]:
            page.set_viewport_size({"width":width,"height":1100})
            page.get_by_role("button", name="Fit", exact=True).click()
            seek(8)
            expect(captions).to_contain_text("A longer line")
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
            assert page.locator(".rts-scroller").bounding_box()["height"] >= 140
            page.screenshot(path=str(media / f"lyric-audition-{name}.png"), full_page=True)
        results["responsive_layout_and_long_line"] = True
        page.set_viewport_size({"width":1440,"height":1000})
        page.get_by_role("button", name="Fit", exact=True).click()
        seek(11.8)
        page.get_by_role("button", name="Play", exact=True).click()
        expect(page.get_by_role("button", name="Play", exact=True)).to_be_visible()
        expect(captions).to_have_text("")
        results["end_clears_subtitles"] = True
        assert not errors, errors
        page.close()
        assert not context.pages
        context.close()
        context = None
        video.save_as(str(work / "lyric-audition-demo-raw.webm"))
    except Exception:
        print(json.dumps({"page_errors": errors}), flush=True)
        if context and context.pages:
            context.pages[0].screenshot(path=str(work / "browser-failure.png"))
        raise
    finally:
        if context:
            context.close()
        browser.close()
        assert not browser.is_connected()
results["cleanup"] = "Page inventory empty; context/browser closed; isolated helper exits"
results["scope"] = "Actual browser UI with synthetic tones/text/vector fixture; video is silent; no subjective music listening claim"
(work / "lyric-audition-browser.json").write_text(json.dumps(results, indent=2), encoding="utf-8")
print(json.dumps(results, indent=2))
