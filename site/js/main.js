// Entry point. Everything here is progressive enhancement: the page is complete without JS.
import { initMotionToggle } from './motion.js';
import { initParallax } from './parallax.js';
import { initReveal } from './reveal.js';

const scenes = [...document.querySelectorAll('.scene')];
const stillToggle = document.querySelector('#motion-toggle');

initMotionToggle(stillToggle);
initReveal(scenes, document.querySelectorAll('.chapters a'));
initParallax(scenes, stillToggle);
