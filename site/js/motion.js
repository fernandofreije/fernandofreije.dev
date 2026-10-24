// The "pause animations" switch. CSS reacts to its checked state on its own (see ui.css),
// so it works without JS; this only remembers the visitor's choice between visits.

const STORAGE_KEY = 'motion-paused';

/** @param {HTMLInputElement | null} toggle */
export function initMotionToggle(toggle) {
  if (!toggle) return;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) toggle.checked = stored === 'true';
  } catch {
    // Storage can be unavailable (privacy mode); the switch still works for this visit.
  }
  toggle.addEventListener('change', () => {
    try {
      localStorage.setItem(STORAGE_KEY, String(toggle.checked));
    } catch {}
  });
}
