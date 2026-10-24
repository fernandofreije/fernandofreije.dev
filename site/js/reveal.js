// Scene visibility: drives animations, the one-time content reveal and the chapter rail.

/**
 * @param {HTMLElement[]} scenes
 * @param {NodeListOf<HTMLAnchorElement>} chapterLinks links whose hash targets a scene id
 */
export function initReveal(scenes, chapterLinks) {
  // `is-in-view` gates CSS animations so off-screen scenes cost nothing.
  const visibility = new IntersectionObserver((entries) => {
    for (const { target, isIntersecting } of entries) {
      target.classList.toggle('is-in-view', isIntersecting);
    }
  });

  // A scene is "current" once it crosses the middle of the viewport.
  const current = new IntersectionObserver(
    (entries) => {
      for (const { target, isIntersecting } of entries) {
        if (!isIntersecting) continue;
        target.classList.add('is-revealed');
        for (const link of chapterLinks) {
          link.setAttribute('aria-current', String(link.hash === `#${target.id}`));
        }
      }
    },
    { rootMargin: '-45% 0px -45% 0px' },
  );

  for (const scene of scenes) {
    visibility.observe(scene);
    current.observe(scene);
  }
}
