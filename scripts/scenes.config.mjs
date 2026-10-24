// Scene composition: the single source of truth for how the art is stacked.
// Layers are listed back-to-front. `depth` (0 = static, 1 = closest) scales parallax.
// `role` opts a layer into a CSS animation defined in site/css/scenes/<scene>.css.

export const CANVAS = { width: 4000, height: 3000 };

export const scenes = {
  'dark-fantasy': [
    { src: 'bg/cielo.png', depth: 0.1 },
    { src: 'bg/castle.png', depth: 0.2 },
    { src: 'bg/road.png', depth: 0.4 },
    { src: 'fg/floor.png', depth: 0.6 },
    { src: 'fg/caballero.png', depth: 0.8 },
    { src: 'fg/perro.png', depth: 0.8 },
    { src: 'anim/fuego/frame1.png', name: 'fire-1', depth: 0.8, role: 'fire' },
    { src: 'anim/fuego/frame2.png', name: 'fire-2', depth: 0.8, role: 'fire' },
  ],
  lovecraft: [
    { src: 'bg/cielo.png', depth: 0.1 },
    { src: 'bg/fondo.png', depth: 0.3 },
    ...[1, 2, 3, 4, 5].map((i) => ({
      src: `anim/tentaculos/frame${i}.png`,
      name: `tentacle-${i}`,
      depth: 0.4,
      role: 'tentacle',
    })),
    { src: 'fg/personaje.png', depth: 0.8 },
    { src: 'fg/sirena.png', depth: 0.9 },
  ],
  catedral: [
    { src: 'bg/cielo.png', depth: 0.1 },
    { src: 'bg/fondo.png', depth: 0.25 },
    { src: 'fg/estatua.png', depth: 0.45 },
    { src: 'fg/vampiro.png', depth: 0.8 },
    { src: 'fg/perro.png', depth: 0.9 },
  ],
};

// Output widths, as a fraction of the source canvas: renders crisp on a stage
// ~1200px wide (small) and ~2400px wide (large, e.g. 1440px viewport at 2x DPR).
export const SCALES = { s: 0.3, l: 0.6 };
