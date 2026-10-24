---
name: optimize-images
description: Add, replace or re-compose layered art for a scene and regenerate the web-ready images, layer positions and markup. Use whenever files in art-src/ or scripts/scenes.config.mjs change, or a new scene is added.
---

# Optimize images

Source art lives in `art-src/<scene>/` as full-canvas 4000×3000 PNGs (one transparent layer each), plus `ref.png`, the composed reference. Nothing in `art-src/` is deployed.

## Workflow
1. Put or replace the PNG under `art-src/<scene>/{bg,fg,anim/...}/`. Every layer must be exported on the full 4000×3000 canvas, so its position is preserved.
2. Register it in `scripts/scenes.config.mjs`, in back-to-front order:
   - `depth` sets parallax strength, from 0 (static) to 1 (closest to the viewer)
   - `name` is optional and defaults to the file name; it must be unique within the scene
   - `role` is optional and hooks the layer into a CSS animation (`fire`, `tentacle`), styled via `[data-role]` in `site/css/scenes/<scene>.css`
3. For a **new scene**, also add a `<section class="scene scene--<scene>">` to `site/index.html` with an empty `<!-- layers:<scene> --><!-- /layers -->` region in its `.stage`, plus `site/css/scenes/<scene>.css` linked in the head.
4. Run `npm run images`. It crops every layer to its visible pixels, writes WebP at two sizes into `site/assets/<scene>/`, regenerates `site/css/layers.generated.css`, and rewrites the layer `<img>` tags in `site/index.html`.
5. Run the `visual-check` skill and compare against `ref.png`.

Never hand-edit `layers.generated.css` or the markup inside `<!-- layers:* -->` regions; both are overwritten on every run.
