// Tap-or-drag board: tiles in a pool are placed into slots (matching, formula building).
// Works with finger and mouse via Pointer Events; a tap also places a tile (first empty / selected slot),
// so nothing depends on dragging precision. Used by the quiz types 'zuordnung' and 'rechenweg'.
import { h, clear } from './dom.js';

const MOVE_THRESHOLD = 8;

/** Make `el` draggable. onTap() for a click, onDrop(x, y) after a drag. Ghost follows the pointer. */
function makeDraggable(el, { onTap, onDrop, onHover }) {
  el.style.touchAction = 'none';
  el.addEventListener('pointerdown', (e) => {
    if (e.button !== undefined && e.button > 0) return;
    const sx = e.clientX;
    const sy = e.clientY;
    let ghost = null;
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* not capturable, still works for mouse */
    }
    const move = (ev) => {
      if (!ghost) {
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < MOVE_THRESHOLD) return;
        const r = el.getBoundingClientRect();
        ghost = el.cloneNode(true);
        ghost.classList.add('ghost');
        ghost.style.cssText = `position:fixed;left:0;top:0;width:${r.width}px;pointer-events:none;z-index:60;margin:0;`;
        document.body.append(ghost);
        el.classList.add('drag-src');
      }
      const w = ghost.offsetWidth;
      const hh = ghost.offsetHeight;
      ghost.style.transform = `translate(${ev.clientX - w / 2}px, ${ev.clientY - hh / 2 - 26}px)`;
      onHover?.(document.elementFromPoint(ev.clientX, ev.clientY));
    };
    const end = (ev) => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', cancel);
      if (ghost) {
        ghost.remove();
        el.classList.remove('drag-src');
        onHover?.(null);
      }
      return ev;
    };
    const up = (ev) => {
      const dragged = Boolean(ghost);
      end(ev);
      if (dragged) onDrop?.(document.elementFromPoint(ev.clientX, ev.clientY));
      else onTap?.();
    };
    const cancel = (ev) => end(ev);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', cancel);
  });
  // keyboard / assistive tech: Enter or Space acts like a tap
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onTap?.();
    }
  });
}

/**
 * tiles: [{ id, html }], slots: array of slot ids. onChange fires after each placement.
 * Returns { pool, slot(id, cls), values(), full(), lock(), mark(id, ok), place(slotId, tileId) }.
 */
export function createBoard({ tiles, slots, onChange }) {
  const byId = new Map(tiles.map((t) => [t.id, t]));
  const assigned = new Map(slots.map((s) => [s, null])); // slot id -> tile id
  const slotEls = new Map();
  const pool = h('div', { class: 'tile-pool', dataset: { pool: '1' } });
  let active = null;
  let locked = false;

  const placedTiles = () => new Set([...assigned.values()].filter(Boolean));

  function setSlot(slotId, tileId) {
    // remove the tile from wherever it currently sits
    for (const [s, t] of assigned) if (t === tileId && tileId) assigned.set(s, null);
    assigned.set(slotId, tileId);
  }

  function nextEmpty() {
    if (active && !assigned.get(active)) return active;
    return slots.find((s) => !assigned.get(s)) ?? null;
  }

  function tileEl(tile, fromSlot) {
    const el = h('span', { class: 'tile-chip', role: 'button', tabindex: '0', html: tile.html, dataset: { tile: tile.id } });
    if (locked) return el;
    makeDraggable(el, {
      onTap() {
        if (fromSlot) {
          assigned.set(fromSlot, null);
          active = fromSlot;
        } else {
          const target = nextEmpty();
          if (!target) return;
          setSlot(target, tile.id);
          active = null;
        }
        draw();
        onChange?.();
      },
      onDrop(under) {
        const slotEl = under?.closest?.('[data-slot]');
        const targetId = slotEl?.dataset.slot;
        if (targetId && assigned.has(targetId)) {
          const displaced = assigned.get(targetId);
          if (fromSlot) assigned.set(fromSlot, displaced && displaced !== tile.id ? displaced : null);
          setSlot(targetId, tile.id);
        } else if (fromSlot) {
          assigned.set(fromSlot, null);
        } else {
          return;
        }
        active = null;
        draw();
        onChange?.();
      },
      onHover(under) {
        for (const el2 of slotEls.values()) el2.classList.remove('hover');
        under?.closest?.('[data-slot]')?.classList.add('hover');
      },
    });
    return el;
  }

  function draw() {
    const used = placedTiles();
    clear(pool);
    for (const tile of tiles) if (!used.has(tile.id)) pool.append(tileEl(tile, null));
    pool.classList.toggle('empty', used.size === tiles.length);
    for (const [slotId, el] of slotEls) {
      clear(el);
      const tileId = assigned.get(slotId);
      el.classList.toggle('filled', Boolean(tileId));
      el.classList.toggle('active', active === slotId && !locked);
      if (tileId) el.append(tileEl(byId.get(tileId), slotId));
    }
  }

  return {
    pool,
    slot(id, cls = '') {
      const el = h('span', { class: `slot ${cls}`, dataset: { slot: id } });
      el.addEventListener('click', (e) => {
        if (locked || e.target !== el) return;
        active = active === id ? null : id;
        draw();
      });
      slotEls.set(id, el);
      draw();
      return el;
    },
    values: () => Object.fromEntries(assigned),
    full: () => [...assigned.values()].every(Boolean),
    any: () => [...assigned.values()].some(Boolean),
    lock() {
      locked = true;
      active = null;
      draw();
    },
    mark(id, ok) {
      slotEls.get(id)?.classList.add(ok ? 'ok' : 'bad');
    },
    place(slotId, tileId) {
      setSlot(slotId, tileId);
      draw();
    },
    draw,
  };
}

/** Vertical drag-to-reorder for a list of <li>. Calls onReorder(newOrderOfDataIdx). Handle = element inside li with [data-handle]. */
export function sortable(list, onReorder) {
  list.addEventListener('pointerdown', (e) => {
    const handle = e.target.closest?.('[data-handle]');
    const li = handle?.closest('li');
    if (!li || !list.contains(li)) return;
    e.preventDefault();
    const startY = e.clientY;
    const startTop = li.offsetTop;
    li.classList.add('dragging');
    try {
      handle.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    const move = (ev) => {
      const siblings = [...list.children].filter((c) => c !== li);
      let before = null;
      for (const s of siblings) {
        const r = s.getBoundingClientRect();
        if (ev.clientY < r.top + r.height / 2) {
          before = s;
          break;
        }
      }
      if (before !== li.nextElementSibling) list.insertBefore(li, before);
      li.style.transform = `translateY(${ev.clientY - startY - (li.offsetTop - startTop)}px)`;
    };
    const up = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', up);
      li.classList.remove('dragging');
      li.style.transform = '';
      onReorder([...list.children].map((c) => Number(c.dataset.idx)));
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
  });
}
