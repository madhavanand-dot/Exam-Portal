# 2026-10-19 — Direct PDF downloads for the installed app

The result-page question-paper buttons now generate a real PDF and download it to the device. No print service, popup or external tab is required. A persistent download link lets students retry the save, and supported phones also offer Save PDF to Files / Share.

PDF rendering processes one question at a time with bounded canvases to avoid full-paper canvas memory limits on phones. Both question and answer versions retain the paper layout. The PDF libraries are served from the portal. Reattempts remain disabled.

Validation: isolated Chromium runs with 390px mobile emulation and desktop viewport, both question/answer versions; valid PDF blobs of 0.7–0.9 MB, eight nonblank pages with all 45 questions; no print/popup calls or page errors. The test runner's OS download handler cancels file saves, so PDF bytes were verified directly from the generated downloadable Blob; physical installed-app save behavior remains to be confirmed. MathJax is stubbed in the isolated fixture.
