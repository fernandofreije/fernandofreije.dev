---
name: visual-check
description: Render the site in a real browser, screenshot every scene at desktop, ultrawide, mobile and 320px reflow sizes, and audit accessibility (axe-core, horizontal overflow), reporting console errors and page weight. Use after any change to HTML, CSS, JS or art in site/, and whenever asked how the page looks or whether it is accessible.
---

# Visual check

Visual feedback is the main quality signal for this site. Don't trust CSS reasoning alone; look at the screenshots.

1. Make sure the dev server is running (`npm run dev`, which serves `site/` on http://localhost:8080). Start it in the background if it isn't.
2. Run `npm run shots`. Optional flags go after `--`:
   - `--only desktop,mobile` limits viewports (`desktop` 1440×900, `ultrawide` 2560×1080, `mobile` 390×844 @2x, `reflow` 320×640)
   - `--reduced-motion` emulates `prefers-reduced-motion: reduce`
   - `--forced-colors` emulates Windows High Contrast (`forced-colors: active`)
   - `--url <url>` targets another server
3. Read the PNGs in `.shots/` (`<viewport>[-reduced|-forced]-<scene-id>.png` and `…-full.png`) with the Read tool. Compare them against the composed references in `art-src/<scene>/ref.png`.
4. The run exits non-zero if any `!` line is printed. Treat every one as a bug: console errors, failed requests, HTTP ≥ 400, axe-core WCAG 2.2 AA and best-practice violations, and horizontal overflow (WCAG 1.4.10 reflow).

## Accessibility checks the script can't do
After UI changes, also run with `--reduced-motion` and `--forced-colors` and look at the screenshots:
- **Contrast over the art.** axe can't measure text over images. If text over an illustration changes, measure the brightest background pixels behind it with the text hidden (see the title scrim in `site/css/scenes/dark-fantasy.css`) and keep 4.5:1, or 3:1 for large text.
- **Forced colors.** Everything that carries information must survive: stamps, postmarks, the pause switch's state. Watch out for `mix-blend-mode` and background-only drawing.
- **Motion.** With the "Pause animations" switch on, or reduced motion set, nothing should move.
- **Keyboard.** Tab through the page: focus is always visible and never lands on hidden content.

## What to look for
- No letterbox bars at any viewport, and the characters stay in frame on mobile (tune `--focus-x/--focus-y` in `site/css/scenes/<scene>.css`).
- All five tentacles appear over time in the Lovecraft scene, and the fire flickers in Dark Fantasy.
- Text stays readable over the art and nothing overlaps the chapter rail or the pause switch.

## Environment notes
`run.mjs` detects WSL and runs `shoot.mjs` with Windows `node.exe` against the Windows Edge install, because WSL's Chromium is missing system libraries. On other machines it uses the local Node and Playwright's browser. Set `BROWSER_PATH` to override the browser executable. axe-core is injected from `node_modules`, so the audit works offline.
