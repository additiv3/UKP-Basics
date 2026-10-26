// Horizontal swipe between pages. Vertical scrolling stays native (touch-action: pan-y);
// gestures that start on interactive widgets (sliders, tiles, canvases, wide formulas) are ignored.
import { reducedMotion } from '../sims/kit.js';

const IGNORE = 'input, textarea, select, canvas, .board, .tile-pool, .tile-chip, .slot, .sortlist, .drag-handle, .calc-row, [data-noswipe]';
const THRESHOLD = 0.22; // share of the width
const FLICK = 0.45; // px per ms

// true if the gesture starts inside something that scrolls sideways itself (wide formula, table, chip row)
function inScroller(node, root) {
  for (let n = node; n && n !== root; n = n.parentElement) {
    if (n.scrollWidth > n.clientWidth + 2 && /auto|scroll/.test(getComputedStyle(n).overflowX)) return true;
  }
  return false;
}

export function attachSwipe(el, { canLeft, canRight, onLeft, onRight }) {
  let start = null;
  let dx = 0;
  let locked = null; // 'x' | 'y'
  let page = null;
  let suppress = 0; // timestamp until which clicks are swallowed after a drag

  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.target.closest(IGNORE) || inScroller(e.target, el)) return;
    start = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
    dx = 0;
    locked = null;
    page = el.firstElementChild;
  });

  el.addEventListener('pointermove', (e) => {
    if (!start || e.pointerId !== start.id) return;
    const mx = e.clientX - start.x;
    const my = e.clientY - start.y;
    if (!locked) {
      if (Math.abs(mx) < 10 && Math.abs(my) < 10) return;
      locked = Math.abs(mx) > Math.abs(my) * 1.2 ? 'x' : 'y';
      if (locked === 'y') {
        start = null;
        return;
      }
      if (window.getSelection) window.getSelection().removeAllRanges();
    }
    const allowed = mx < 0 ? canLeft() : canRight();
    dx = allowed ? mx : mx * 0.25; // rubber band at the ends
    if (page) {
      page.style.transition = 'none';
      page.style.transform = `translateX(${dx}px)`;
      page.style.opacity = String(1 - Math.min(0.5, Math.abs(dx) / el.clientWidth / 1.5));
    }
  });

  const end = (e) => {
    if (!start || (e && e.pointerId !== start.id)) return;
    const dt = performance.now() - start.t;
    const w = el.clientWidth || 1;
    const fast = Math.abs(dx) / dt > FLICK && Math.abs(dx) > 40;
    const far = Math.abs(dx) > w * THRESHOLD;
    const go = locked === 'x' && (fast || far);
    if (locked === 'x' && Math.abs(dx) > 10) suppress = performance.now() + 350;
    start = null;
    if (go && dx < 0 && canLeft()) return onLeft();
    if (go && dx > 0 && canRight()) return onRight();
    if (page && dx) {
      page.style.transition = 'transform .22s ease, opacity .22s ease';
      page.style.transform = '';
      page.style.opacity = '';
    }
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);

  // a horizontal drag must not turn into a click on a button underneath
  el.addEventListener(
    'click',
    (e) => {
      if (performance.now() < suppress) {
        e.stopPropagation();
        e.preventDefault();
      }
    },
    true,
  );
}

/** Replace oldEl with newEl inside stage, sliding in direction dir (1 = forward). */
export async function slide(oldEl, newEl, stage, dir) {
  if (reducedMotion() || !oldEl.animate) {
    stage.replaceChildren(newEl);
    return;
  }
  const from = oldEl.style.transform || 'translateX(0)';
  const out = oldEl.animate(
    [
      { transform: from, opacity: oldEl.style.opacity || 1 },
      { transform: `translateX(${-dir * 40}%)`, opacity: 0 },
    ],
    { duration: 160, easing: 'ease-in', fill: 'forwards' },
  );
  // background tabs may never finish animations: do not wait longer than the animation itself
  await Promise.race([out.finished.catch(() => {}), new Promise((r) => setTimeout(r, 200))]);
  oldEl.style.transform = '';
  oldEl.style.opacity = '';
  out.cancel();
  stage.replaceChildren(newEl);
  newEl.style.transform = '';
  newEl.style.opacity = '';
  newEl.animate(
    [
      { transform: `translateX(${dir * 40}%)`, opacity: 0 },
      { transform: 'translateX(0)', opacity: 1 },
    ],
    { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' },
  );
}
