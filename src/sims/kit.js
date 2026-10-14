// Shared building blocks for interactive simulations: themed canvas, plot helper, sliders, readouts.
// Simulations are physics definitions with freely chosen parameters (no material data).
import { h } from '../ui/dom.js';
import { num } from '../core/format.js';

const SUPS = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '-': '⁻' };
export const supNum = (n) => String(n).replace(/[0-9-]/g, (c) => SUPS[c]);
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Current theme colors, read from the CSS custom properties (so canvases follow light/dark). */
export function palette() {
  const cs = getComputedStyle(document.documentElement);
  const g = (n) => cs.getPropertyValue(n).trim();
  return {
    text: g('--text'),
    muted: g('--muted'),
    line: g('--line'),
    grid: g('--fig-grid'),
    accent: g('--accent'),
    bright: g('--accent-bright'),
    laser: g('--fig-laser'),
    warm: g('--fig-warm'),
    fill: g('--fig-fill'),
    surface: g('--surface'),
    surface2: g('--surface-2'),
    ok: g('--ok'),
    bad: g('--bad'),
    xp: g('--xp'),
    soft: g('--fig-soft'),
  };
}

export const alpha = (color, a) => `color-mix(in srgb, ${color} ${Math.round(a * 100)}%, transparent)`;

const mq = window.matchMedia?.('(prefers-color-scheme: dark)');

/**
 * A canvas that fills its box, is DPR-aware and redraws on resize and theme change.
 * draw(ctx, w, h, pal) gets CSS pixel units. Returns { canvas, redraw }.
 */
export function canvasView(box, { aspect = 0.6, draw }) {
  const canvas = h('canvas', { class: 'sim-canvas', role: 'img' });
  canvas.style.aspectRatio = `1 / ${aspect}`;
  box.append(canvas);
  const ctx = canvas.getContext('2d');
  let raf = 0;
  let size = { w: 0, h: 0 };

  const paint = () => {
    raf = 0;
    if (!canvas.isConnected) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const w = canvas.clientWidth;
    const hh = canvas.clientHeight;
    if (!w || !hh) return;
    if (size.w !== w || size.h !== hh || canvas.width !== Math.round(w * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(hh * dpr);
      size = { w, h: hh };
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, hh);
    draw(ctx, w, hh, palette());
  };
  const redraw = () => {
    if (!raf) raf = requestAnimationFrame(paint);
  };
  new ResizeObserver(redraw).observe(canvas);
  mq?.addEventListener?.('change', redraw);
  redraw();
  return { canvas, redraw, ctx };
}

/** Animation loop that pauses while the canvas is off-screen or detached. fn(dt_seconds, t_seconds). */
export function animate(canvas, fn) {
  if (reducedMotion()) return () => {};
  let running = false;
  let visible = true;
  let last = 0;
  let t0 = 0;
  let id = 0;
  const frame = (now) => {
    if (!canvas.isConnected) return stop();
    if (!t0) t0 = now;
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    fn(dt, (now - t0) / 1000);
    id = requestAnimationFrame(frame);
  };
  const start = () => {
    if (running || !visible) return;
    running = true;
    last = performance.now();
    id = requestAnimationFrame(frame);
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(id);
  };
  const io = new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
    if (visible) start();
    else stop();
  });
  io.observe(canvas);
  start();
  return () => {
    stop();
    io.disconnect();
  };
}

/* ---------- ticks ---------- */

function niceStep(range, target = 5) {
  const raw = range / target;
  const p = 10 ** Math.floor(Math.log10(raw));
  const m = raw / p;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
}

export function linTicks(min, max, target = 5) {
  const step = niceStep(max - min, target);
  const out = [];
  for (let v = Math.ceil(min / step - 1e-9) * step; v <= max + step * 1e-6; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
  return out;
}

export function logTicks(min, max) {
  const out = [];
  for (let e = Math.ceil(Math.log10(min) - 1e-9); e <= Math.floor(Math.log10(max) + 1e-9); e += 1) out.push(10 ** e);
  return out;
}

const fmtLin = (v) => num(v, 3);
const fmtLog = (v) => `10${supNum(Math.round(Math.log10(v)))}`;

/** Cartesian plot area with optional log axes, grid, ticks and helpers to draw in data coordinates. */
export class Plot {
  constructor(ctx, pal, box, { xmin, xmax, ymin, ymax, xlog = false, ylog = false }) {
    Object.assign(this, { ctx, pal, ...box, xmin, xmax, ymin, ymax, xlog, ylog });
    this.fx = xlog ? (v) => Math.log10(v) : (v) => v;
    this.fy = ylog ? (v) => Math.log10(v) : (v) => v;
  }

  X(v) {
    const { fx, xmin, xmax } = this;
    return this.x + ((fx(v) - fx(xmin)) / (fx(xmax) - fx(xmin))) * this.w;
  }

  Y(v) {
    const { fy, ymin, ymax } = this;
    return this.y + this.h - ((fy(v) - fy(ymin)) / (fy(ymax) - fy(ymin))) * this.h;
  }

  inv(px) {
    const { fx, xmin, xmax } = this;
    const t = (px - this.x) / this.w;
    const v = fx(xmin) + t * (fx(xmax) - fx(xmin));
    return this.xlog ? 10 ** v : v;
  }

  axes({ xlabel, ylabel, xticks, yticks, xfmt, yfmt, noYTicks = false } = {}) {
    const { ctx, pal } = this;
    const xt = xticks ?? (this.xlog ? logTicks(this.xmin, this.xmax) : linTicks(this.xmin, this.xmax, Math.max(3, Math.round(this.w / 70))));
    const yt = yticks ?? (this.ylog ? logTicks(this.ymin, this.ymax) : linTicks(this.ymin, this.ymax, Math.max(3, Math.round(this.h / 46))));
    const xf = xfmt ?? (this.xlog ? fmtLog : fmtLin);
    const yf = yfmt ?? (this.ylog ? fmtLog : fmtLin);
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = pal.grid;
    ctx.fillStyle = pal.muted;
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (const v of xt) {
      const px = Math.round(this.X(v)) + 0.5;
      if (px < this.x - 1 || px > this.x + this.w + 1) continue;
      ctx.beginPath();
      ctx.moveTo(px, this.y);
      ctx.lineTo(px, this.y + this.h);
      ctx.stroke();
      ctx.fillText(xf(v), px, this.y + this.h + 5);
    }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (const v of yt) {
      const py = Math.round(this.Y(v)) + 0.5;
      if (py < this.y - 1 || py > this.y + this.h + 1) continue;
      ctx.beginPath();
      ctx.moveTo(this.x, py);
      ctx.lineTo(this.x + this.w, py);
      ctx.stroke();
      if (!noYTicks) ctx.fillText(yf(v), this.x - 6, py);
    }
    ctx.strokeStyle = pal.soft;
    ctx.strokeRect(this.x + 0.5, this.y + 0.5, this.w, this.h);
    ctx.fillStyle = pal.muted;
    ctx.font = '600 11.5px system-ui, sans-serif';
    if (xlabel) {
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText(xlabel, this.x + this.w, this.y + this.h + 34);
    }
    if (ylabel) {
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(ylabel, this.x, this.y - 6);
    }
    ctx.restore();
  }

  clip(fn) {
    const { ctx } = this;
    ctx.save();
    ctx.beginPath();
    ctx.rect(this.x, this.y - 2, this.w, this.h + 4);
    ctx.clip();
    fn();
    ctx.restore();
  }

  /** Draw y = fn(x) over the x range. */
  curve(fn, { color, width = 2.5, dash, steps = 160, fill } = {}) {
    const { ctx } = this;
    this.clip(() => {
      ctx.beginPath();
      let first = true;
      for (let i = 0; i <= steps; i += 1) {
        const t = i / steps;
        const v = this.xlog ? 10 ** (Math.log10(this.xmin) + t * (Math.log10(this.xmax) - Math.log10(this.xmin))) : this.xmin + t * (this.xmax - this.xmin);
        const y = fn(v);
        if (!Number.isFinite(y) || (this.ylog && y <= 0)) {
          first = true;
          continue;
        }
        const px = this.X(v);
        const py = this.Y(y);
        if (first) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
        first = false;
      }
      if (fill) {
        ctx.save();
        ctx.lineTo(this.X(this.xmax), this.Y(this.ymin));
        ctx.lineTo(this.X(this.xmin), this.Y(this.ymin));
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.restore();
        return;
      }
      ctx.lineWidth = width;
      ctx.strokeStyle = color;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.setLineDash(dash ?? []);
      ctx.stroke();
    });
  }

  /** Fill the area between fn(x) and a baseline y0 where fn(x) > y0 (clipped to the plot). */
  areaAbove(fn, y0, color, steps = 220) {
    const { ctx } = this;
    this.clip(() => {
      ctx.beginPath();
      let open = false;
      let startX = 0;
      for (let i = 0; i <= steps; i += 1) {
        const t = i / steps;
        const v = this.xmin + t * (this.xmax - this.xmin);
        const y = fn(v);
        if (y > y0) {
          if (!open) {
            ctx.moveTo(this.X(v), this.Y(y0));
            open = true;
            startX = v;
          }
          ctx.lineTo(this.X(v), this.Y(y));
        } else if (open) {
          ctx.lineTo(this.X(v), this.Y(y0));
          ctx.closePath();
          open = false;
        }
      }
      if (open) {
        ctx.lineTo(this.X(this.xmax), this.Y(y0));
        ctx.closePath();
      }
      void startX;
      ctx.fillStyle = color;
      ctx.fill();
    });
  }

  hline(y, { color, width = 1.5, dash = [6, 5], label, labelSide = 'left' } = {}) {
    const { ctx } = this;
    const py = this.Y(y);
    if (py < this.y || py > this.y + this.h) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.moveTo(this.x, py);
    ctx.lineTo(this.x + this.w, py);
    ctx.stroke();
    if (label) {
      ctx.setLineDash([]);
      ctx.fillStyle = color;
      ctx.font = '600 11.5px system-ui, sans-serif';
      ctx.textBaseline = 'bottom';
      ctx.textAlign = labelSide === 'left' ? 'left' : 'right';
      ctx.fillText(label, labelSide === 'left' ? this.x + 6 : this.x + this.w - 6, py - 3);
    }
    ctx.restore();
  }

  vline(x, { color, width = 1.5, dash = [6, 5], label, labelBelow = false } = {}) {
    const { ctx } = this;
    const px = this.X(x);
    if (px < this.x - 1 || px > this.x + this.w + 1) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.moveTo(px, this.y);
    ctx.lineTo(px, this.y + this.h);
    ctx.stroke();
    if (label) {
      ctx.setLineDash([]);
      ctx.fillStyle = color;
      ctx.font = '600 11.5px system-ui, sans-serif';
      ctx.textAlign = px > this.x + this.w - 60 ? 'right' : 'left';
      ctx.textBaseline = labelBelow ? 'bottom' : 'top';
      ctx.fillText(label, px + (ctx.textAlign === 'left' ? 5 : -5), labelBelow ? this.y + this.h - 4 : this.y + 4);
    }
    ctx.restore();
  }

  dot(x, y, { color, r = 5.5, ring = true } = {}) {
    const { ctx } = this;
    const px = this.X(x);
    const py = this.Y(y);
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
    if (ring) {
      ctx.strokeStyle = this.pal.surface;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  }

  text(txt, x, y, { color, size = 12, bold = false, align = 'left', base = 'alphabetic' } = {}) {
    const { ctx } = this;
    ctx.save();
    ctx.fillStyle = color ?? this.pal.text;
    ctx.font = `${bold ? '700 ' : ''}${size}px system-ui, sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = base;
    ctx.fillText(txt, x, y);
    ctx.restore();
  }
}

/* ---------- controls ---------- */

const round3 = (x) => Number(x.toPrecision(3));

/**
 * Labelled slider. log: true maps the thumb logarithmically between min and max.
 * Returns { el, get, set }. onInput(value) fires on every change.
 */
export function control({ label, unit = '', min, max, value, log = false, step, fmt, onInput }) {
  const out = h('output', { class: 'calc-val' });
  const toT = (v) => (log ? Math.log(v / min) / Math.log(max / min) : v);
  const fromT = (t) => (log ? round3(min * (max / min) ** t) : t);
  let current = value;
  const input = h('input', {
    type: 'range',
    min: log ? 0 : min,
    max: log ? 1 : max,
    step: log ? 0.0005 : (step ?? (max - min) / 400),
    value: toT(value),
    'aria-label': `${label}${unit ? ` in ${unit}` : ''}`,
  });
  const show = () => {
    out.textContent = fmt ? fmt(current) : `${num(current, 3)}${unit ? ` ${unit}` : ''}`;
  };
  input.addEventListener('input', () => {
    current = fromT(Number(input.value));
    show();
    onInput?.(current);
  });
  show();
  return {
    el: h('label', { class: 'calc-row' }, h('span', { class: 'calc-label' }, label), input, out),
    get: () => current,
    set(v) {
      current = v;
      input.value = toT(v);
      show();
    },
  };
}

/** Segmented choice (radio-like buttons). */
export function segmented(options, value, onChange) {
  const wrap = h('div', { class: 'segmented', role: 'group' });
  const buttons = options.map((o) =>
    h(
      'button',
      {
        type: 'button',
        class: `seg ${o.id === value ? 'on' : ''}`,
        'aria-pressed': o.id === value,
        onClick: () => {
          buttons.forEach((b) => {
            b.classList.toggle('on', b === btn(o.id));
            b.setAttribute('aria-pressed', b === btn(o.id));
          });
          onChange(o.id);
        },
        dataset: { id: o.id },
      },
      o.label,
    ),
  );
  const btn = (id) => buttons.find((b) => b.dataset.id === id);
  wrap.append(...buttons);
  return wrap;
}

/** Grid of read-only result tiles; update() with [{label, value, tone}] replaces them. */
export function readouts() {
  const el = h('div', { class: 'calc-out' });
  return {
    el,
    update(items) {
      el.replaceChildren(
        ...items.map((o) =>
          h('div', { class: `calc-item ${o.tone ?? ''}` }, h('span', { class: 'calc-item-label' }, o.label), h('strong', {}, o.value)),
        ),
      );
    },
  };
}

export const note = (txt) => h('p', { class: 'hint sim-note' }, txt);
