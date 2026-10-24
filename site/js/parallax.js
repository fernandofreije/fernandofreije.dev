// Parallax input. Layers move in CSS (see scene.css); this only publishes, per scene:
//   --pointer-x / --pointer-y  pointer position, -1…1 from the viewport centre
//   --progress                 0 when the scene enters from below, 1 when it leaves at the top

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(pointer: fine)');

/**
 * @param {HTMLElement[]} scenes
 * @param {HTMLInputElement | null} stillToggle when checked, layers rest in place
 */
export function initParallax(scenes, stillToggle) {
  if (reducedMotion.matches) return;

  const visible = new Set();
  const pointer = { x: 0, y: 0 };
  let frame = 0;

  const render = () => {
    frame = 0;
    if (stillToggle?.checked) {
      for (const scene of scenes) {
        scene.style.removeProperty('--progress');
        scene.style.removeProperty('--pointer-x');
        scene.style.removeProperty('--pointer-y');
      }
      return;
    }
    for (const scene of visible) {
      const { top, height } = scene.getBoundingClientRect();
      const progress = (innerHeight - top) / (height + innerHeight);
      scene.style.setProperty('--progress', progress.toFixed(4));
      scene.style.setProperty('--pointer-x', pointer.x.toFixed(4));
      scene.style.setProperty('--pointer-y', pointer.y.toFixed(4));
    }
  };
  const schedule = () => {
    frame ||= requestAnimationFrame(render);
  };

  const observer = new IntersectionObserver((entries) => {
    for (const { target, isIntersecting } of entries) {
      if (isIntersecting) visible.add(target);
      else visible.delete(target);
    }
    schedule();
  });
  scenes.forEach((scene) => observer.observe(scene));

  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  stillToggle?.addEventListener('change', schedule);

  if (finePointer.matches) {
    addEventListener(
      'pointermove',
      (event) => {
        pointer.x = (event.clientX / innerWidth) * 2 - 1;
        pointer.y = (event.clientY / innerHeight) * 2 - 1;
        schedule();
      },
      { passive: true },
    );
  }
}
