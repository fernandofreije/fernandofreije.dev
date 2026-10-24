---
name: visual-check
description: Render the site in a real browser and screenshot every scene at desktop, ultrawide and mobile sizes, reporting console errors and page weight. Use after any change to HTML, CSS, JS or art in site/, and whenever asked how the page looks.
---

# Visual check

Visual feedback is the main quality signal for this site. Don't trust CSS reasoning alone; look at the screenshots.

1. Make sure the dev server is running (`npm run dev`, which serves `site/` on http://localhost:8080). Start it in the background if it isn't.
2. Run `npm run shots`. Optional flags go after `--`:
   - `--only desktop,mobile` limits viewports (`desktop` 1440×900, `ultrawide` 2560×1080, `mobile` 390×844 @2x)
   - `--reduced-motion` emulates `prefers-reduced-motion: reduce`
   - `--url <url>` targets another server
3. Read the PNGs in `.shots/` (`<viewport>-<scene-id>.png` and `<viewport>-full.png`) with the Read tool. Compare them against the composed references in `art-src/<scene>/ref.png`.
4. Treat any `!` line in the output (console errors, failed requests, HTTP ≥ 400) as a bug.

## What to look for
- No letterbox bars at any viewport, and the characters stay in frame on mobile (tune `--focus-x/--focus-y` in `site/css/scenes/<scene>.css`).
- All five tentacles appear over time in the Lovecraft scene, and the fire flickers in Dark Fantasy.
- Text stays readable over the art (contrast, shadows) and nothing overlaps the chapter rail.

## Environment notes
`run.mjs` detects WSL and runs `shoot.mjs` with Windows `node.exe` against the Windows Edge install, because WSL's Chromium is missing system libraries. On other machines it uses the local Node and Playwright's browser. Set `BROWSER_PATH` to override the browser executable.
