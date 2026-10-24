// Entry point. Everything here is progressive enhancement: the page is complete without JS.
import { initParallax } from './parallax.js';
import { initReveal } from './reveal.js';

const scenes = [...document.querySelectorAll('.scene')];

initReveal(scenes, document.querySelectorAll('.chapters a'));
initParallax(scenes);
