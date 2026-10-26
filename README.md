# Persona webpage

My personal site, told in three illustrated chapters: a knight's campfire (who I am), a scholar's haunted coast (where I've worked) and a cathedral square (how to reach me). All the art is original and hand-layered for parallax.

It's deliberately small: semantic HTML, modern CSS and ~100 lines of JavaScript. No framework and no build step at runtime.

It's also an experiment in how AI-assisted code, hand-written code and hand-made art can work together. The illustrations are drawn by hand and no AI generated them. The code is a mix: some I wrote myself and some I wrote with an AI assistant, always reviewed and checked against the art with the visual check below. The goal is to find out where that collaboration helps, where it gets in the way, and how to keep the human-made parts at the centre.

## How it works

**Scenes are CSS, not script.** Each chapter is a full-viewport sticky backdrop with content scrolling over it. The backdrop holds a 4:3 *stage* that mirrors the 4000×3000 source canvas and is sized like `object-fit: cover`, so the art never letterboxes. A per-scene focus point (`--focus-x/--focus-y`) decides what survives the crop on phones and ultra-wide screens.

**Parallax is a CSS variable pipeline.** JavaScript publishes three numbers per visible scene: `--progress` (scroll position through the scene) and `--pointer-x/--pointer-y`. Each layer's transform is a `calc()` of those and its own `--depth`. The JS doesn't touch individual layers, runs at most once per animation frame, and only for scenes on screen.

**Animations are keyframes.** The campfire flickers with a two-frame `steps()` animation. The tentacles rise out of the sea one by one using `translate` paired with a matching `clip-path`, which keeps the waterline fixed while the tentacle slides through it. Off-screen scenes pause their animations, and everything respects `prefers-reduced-motion`.

**Content is plain HTML.** The CV is written inline as semantic markup (`<article>`, `<time>`, real headings), so it's readable without JavaScript, by screen readers, crawlers and link previews.

## Accessibility

The goal is WCAG 2.2 AA, checked rather than assumed:

- **Motion can always be stopped.** A "Pause animations" switch stills every scene. It's a real checkbox that CSS reacts to via `:has()`, so it works without JavaScript, and the choice is remembered. `prefers-reduced-motion` turns motion off by default.
- **Readable over the art.** Text on the illustrations sits on a soft scrim. Contrast was measured against the brightest pixels behind each line, at every position of the mobile pan.
- **Reflows to 320px** (400% zoom) without horizontal scrolling. It also holds up in Windows High Contrast: stamps, postmarks and the pause switch use system colours there.
- **Screen readers get the whole story:** one short description per illustration, a clear heading outline, and chapter links named "Chapter I, Prologue". Content is never left hidden by the scroll reveal, whether focus moves into it, JS fails or the page is printed.
- **Automated in the visual check.** `npm run shots` runs axe-core at four viewports, flags horizontal overflow, and can emulate reduced motion and forced colours.

## The art pipeline

The illustrations are exported as full-canvas transparent PNGs, one per layer. Shipped as-is, that was 22 images at 4000×3000: about 14MB to download and roughly 1GB of decoded bitmaps.

`scripts/optimize-images.mjs` (using [sharp](https://sharp.pixelplumbing.com/)) crops each layer to its visible pixels, records the crop position on the canvas, and exports WebP at two sizes. It then generates the layer CSS and `<img srcset>` markup from `scripts/scenes.config.mjs`, the single source of truth for layer order, parallax depth and animation roles.

|                    | Before   | After          |
| ------------------ | -------- | -------------- |
| Image payload      | ~14 MB   | 394 KB / 910 KB (1× / 2×) |
| Full page transfer | ~14 MB   | ~1.1 MB        |

## Project layout

```
site/                  deployed as-is to GitHub Pages
  index.html           all content, inline
  css/                 base · scene engine · in-world UI · one file per scene
  js/                  main · reveal (IntersectionObserver) · parallax
  assets/              generated WebP layers, favicon, social preview
art-src/               original layered PNGs and reference compositions
scripts/               image pipeline and scene composition config
.claude/skills/        agent skills for visual regression and the art pipeline
```

## Running locally

```bash
npm install
npm run dev      # http://localhost:8080
npm run images   # after changing anything in art-src/ or scenes.config.mjs
npm run shots    # screenshots of every scene at desktop / ultrawide / mobile
```

## Deployment

Pushing to `main` runs `.github/workflows/pages.yml`, which publishes `site/` to GitHub Pages. Nothing is built in CI because the site is already static.
