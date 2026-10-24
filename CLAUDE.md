# Persona webpage

A personal site and CV told as three illustrated chapters (Dark Fantasy, Lovecraft, Catedral). Static, build-free, deployed from `site/` to GitHub Pages.

## Layout
- `site/` is the only thing that ships: `index.html` (all content inline), `css/`, `js/`, `assets/`
- `art-src/` holds the original full-canvas PNGs and the `ref.png` compositions (not deployed)
- `scripts/` holds the image pipeline; `scenes.config.mjs` is the source of truth for layer order, depth and animation roles
- `.claude/skills/` has `visual-check` (screenshots) and `optimize-images` (art pipeline)

## Conventions
- No frameworks and no runtime build. JS is progressive enhancement only: the page must read fully without it.
- Animation is CSS. JS only publishes state as classes (`is-in-view`, `is-revealed`) or CSS variables (`--progress`, `--pointer-x/y`).
- Layer stacking comes from config order (generated `z-index`), and the content sits above the backdrop with `z-index: 1` inside an isolated `.scene`. Don't introduce ad-hoc z-indexes.
- Per-scene look (palette, focus point, animations, in-world UI) lives in `site/css/scenes/<scene>.css`.
- Content placeholders are marked `TODO(content)`.
- Respect `prefers-reduced-motion` for anything that moves, and make every new animation stop when the "Pause animations" switch (`#motion-toggle`) is checked (see `ui.css`).
- Accessibility target is WCAG 2.2 AA. Text over art needs a scrim with measured contrast; anything that carries information must survive forced colours (no meaning in `mix-blend-mode` or backgrounds alone); content must reflow at 320px.

## Commands
- `npm run dev` serves `site/` on :8080
- `npm run images` regenerates the assets after art or config changes
- `npm run shots` runs the visual and accessibility check (add `-- --reduced-motion` or `-- --forced-colors`); always run it after UI changes and look at the PNGs in `.shots/`
