# Changelog

## 0.2.0 - 2026-10-08

- Add sample-frame loop regions, selection, enable/disable, loop zoom and exact excerpt downloads.
- Add buffered loop playback, shared master-clock playhead, source-change cleanup and explicit playback error callbacks.
- Keep selection separate from autoplay and preserve normal paused-seek behaviour.
- Publish the existing loop implementation as a versioned package rather than an unversioned Git dependency.
- Update the source-map-js development dependency to the version fixing GHSA-68fv-2mgg-jv7q; npm audit reports no vulnerabilities.
- Preserve LF package inputs across platforms so local and CI archives can be compared exactly.

## 0.1.3 — 2026-09-28

- Publish the GitHub Packages copy from an explicit local folder path.
- Verify an existing npm version by tarball checksum before skipping a duplicate upload.
- Complete the npm trusted-publisher bootstrap and document the verified recovery path.

## 0.1.2 — 2026-09-28

- Build and retain an installable package artifact during every CI run.
- Publish GitHub releases to npmjs, GitHub Packages and the GitHub release assets.
- Verify that a release tag exactly matches the package version before publishing.
- Update Vitest to the maintained 4.1 line containing the path-traversal fix.

## 0.1.1 — 2026-09-28

- Build distributable files automatically when the package is installed from GitHub.

## 0.1.0 — 2026-09-28

- Extract the shared audio transport and horizontal sequence timeline from StemLab.
- Add typed waveform, image, marker, block, note, curve, matrix, summary, text and artifact lanes.
- Add fit/zoom, scroll-window reporting, click-to-seek and follow-playhead behaviour.
- Ship ESM, CommonJS, declarations and isolated CSS.
