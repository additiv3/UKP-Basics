// Game "Strahljustage": walk the beam through two irises with two kinematic mirrors (beam walking).
// Geometry (freely chosen): M1 → (L) → M2 → (z1) iris 1 → (z2) iris 2. Mirror knobs change the beam angle.
// Position at an iris: x = p0 + L·a1 + a2·z with a1 = a0 + θ1, a2 = a1 + θ2 (small angles, mrad · mm = µm).
import { h } from '../ui/dom.js';
import { num } from '../core/format.js';
import { canvasView, segmented, alpha } from '../sims/kit.js';
import { t } from '../core/i18n.js';
import { intro, head, verdict, finishScreen, fill, rand, holdButton } from './_common.js';

export const meta = { titel: 'Strahljustage', kurz: 'Bring den Strahl mit zwei Spiegeln durch zwei Irisblenden (Beam Walking)', max: 9 };

const ROUNDS = 3;
const L = 300; // mm, M1 → M2
const Z1 = 100; // mm, M2 → iris 1
const Z2 = 800; // mm, M2 → iris 2
const TOL = 0.1; // mm, centred within
const IRIS = 0.5; // mm, iris radius (drawn)
const VIEW = 4; // ± mm field of view of the alignment card
const STEP = { grob: 0.2, fein: 0.02 }; // mrad per click

function newRound() {
  const off = () => rand(-1.2, 1.2) * (Math.random() < 0.5 ? 1 : -1);
  return {
    p0: [rand(-0.6, 0.6), rand(-0.6, 0.6)], // mm
    a0: [rand(-1, 1) * 1e-3 * 1.5, rand(-1, 1) * 1e-3 * 1.5], // rad
    th1: [off() * 1e-3, off() * 1e-3],
    th2: [off() * 1e-3, off() * 1e-3],
    clicks: 0,
  };
}

function spot(r, z, k) {
  const a1 = r.a0[k] + r.th1[k];
  const a2 = a1 + r.th2[k];
  return r.p0[k] + L * a1 + a2 * z;
}
const at = (r, z) => [spot(r, z, 0), spot(r, z, 1)];
const dist = ([x, y]) => Math.hypot(x, y);

export function mount(root, ctx) {
  let round = 0;
  let total = 0;
  let r = null;
  const stage = h('div', { class: 'game-stage' });
  root.append(stage);

  const start = () => {
    round = 0;
    total = 0;
    next();
  };
  function next() {
    round += 1;
    if (round > ROUNDS) return finishScreen(stage, ctx, total, ROUNDS * 3, 'Beam Walking: Der erste Spiegel zentriert auf die nahe Blende, der zweite auf die ferne, dann wiederholen. In dieser Geometrie konvergiert das mit jedem Durchgang. Die umgekehrte Zuordnung schaukelt sich auf.', start);
    r = newRound();
    draw();
  }

  function draw() {
    let mirror = 'm1';
    let step = 'grob';
    let done = false;

    const card = (z, name) => {
      const box = h('div', { class: 'sim-canvas-box iris-card' });
      const v = canvasView(box, {
        aspect: 1,
        draw(c, W, H, pal) {
          const s = (W / 2 - 6) / VIEW;
          const cx = W / 2;
          const cy = H / 2;
          c.fillStyle = pal.surface2;
          c.fillRect(0, 0, W, H);
          c.strokeStyle = pal.grid;
          c.lineWidth = 1;
          for (let g = -VIEW; g <= VIEW; g += 1) {
            c.beginPath();
            c.moveTo(cx + g * s, 0);
            c.lineTo(cx + g * s, H);
            c.moveTo(0, cy + g * s);
            c.lineTo(W, cy + g * s);
            c.stroke();
          }
          const p = at(r, z);
          const ok = dist(p) <= TOL;
          c.strokeStyle = ok ? pal.ok : pal.text;
          c.lineWidth = 3;
          c.beginPath();
          c.arc(cx, cy, IRIS * s, 0, Math.PI * 2);
          c.stroke();
          const bx = cx + p[0] * s;
          const by = cy - p[1] * s;
          const inView = Math.abs(p[0]) < VIEW && Math.abs(p[1]) < VIEW;
          if (inView) {
            const g = c.createRadialGradient(bx, by, 0, bx, by, 0.9 * s);
            g.addColorStop(0, alpha(pal.laser, 1));
            g.addColorStop(0.35, alpha(pal.laser, 0.85));
            g.addColorStop(1, alpha(pal.laser, 0));
            c.fillStyle = g;
            c.beginPath();
            c.arc(bx, by, 0.9 * s, 0, Math.PI * 2);
            c.fill();
          } else {
            // arrow at the edge towards the beam
            const ang = Math.atan2(-p[1], p[0]);
            const ex = cx + Math.cos(ang) * (W / 2 - 14);
            const ey = cy + Math.sin(ang) * (H / 2 - 14);
            c.fillStyle = pal.laser;
            c.save();
            c.translate(ex, ey);
            c.rotate(ang);
            c.beginPath();
            c.moveTo(10, 0);
            c.lineTo(-6, -7);
            c.lineTo(-6, 7);
            c.closePath();
            c.fill();
            c.restore();
          }
          c.fillStyle = pal.text;
          c.font = '700 12px system-ui, sans-serif';
          c.textAlign = 'left';
          c.fillText(t(name), 8, 16);
          c.fillStyle = ok ? pal.ok : pal.muted;
          c.font = '600 11px system-ui, sans-serif';
          c.fillText(`${num(dist(p), 2)} mm`, 8, H - 8);
        },
      });
      v.canvas.setAttribute('aria-label', t('Justierkarte an {n}', { n: t(name) }));
      return { box, v };
    };
    const c1 = card(Z1, 'Iris 1 (nah)');
    const c2 = card(Z2, 'Iris 2 (fern)');

    // sketch of the beam path
    const sketchBox = h('div', { class: 'sim-canvas-box' });
    const sketch = canvasView(sketchBox, {
      aspect: 0.22,
      draw(c, W, H, pal) {
        const total = L + Z2;
        const X = (mm) => 18 + (mm / total) * (W - 36);
        const y0 = H * 0.55;
        const k = 5; // exaggerate
        const yM2 = y0 - k * (r.p0[0] + L * (r.a0[0] + r.th1[0]));
        c.strokeStyle = pal.laser;
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(X(0) - 14, y0 - k * r.p0[0]);
        c.lineTo(X(0), y0 - k * r.p0[0]);
        c.lineTo(X(L), yM2);
        c.lineTo(X(L + Z2), y0 - k * spot(r, Z2, 0));
        c.stroke();
        const mark = (x, label, col, iris) => {
          c.strokeStyle = col;
          c.lineWidth = iris ? 2 : 4;
          c.beginPath();
          if (iris) {
            c.moveTo(x, y0 - 16);
            c.lineTo(x, y0 - 4);
            c.moveTo(x, y0 + 4);
            c.lineTo(x, y0 + 16);
          } else {
            c.moveTo(x - 5, y0 - 14);
            c.lineTo(x + 5, y0 + 14);
          }
          c.stroke();
          c.fillStyle = pal.muted;
          c.font = '600 10px system-ui, sans-serif';
          c.textAlign = 'center';
          c.fillText(t(label), x, H - 3);
        };
        mark(X(0), 'M1', mirror === 'm1' ? pal.accent : pal.text, false);
        mark(X(L), 'M2', mirror === 'm2' ? pal.accent : pal.text, false);
        mark(X(L + Z1), 'Iris 1', pal.text, true);
        mark(X(L + Z2), 'Iris 2', pal.text, true);
      },
    });
    sketch.canvas.setAttribute('aria-label', t('Skizze des Strahlwegs (seitlich, überhöht)'));

    const clicks = h('span', { class: 'chip' });
    const showClicks = () => { clicks.textContent = t('{n} Dreher', { n: r.clicks }); };
    showClicks();
    const status = h('p', { class: 'game-live', 'aria-live': 'polite' });
    const result = h('div', { class: 'game-result', 'aria-live': 'polite' });

    const redraw = () => {
      c1.v.redraw();
      c2.v.redraw();
      sketch.redraw();
      const d1 = dist(at(r, Z1));
      const d2 = dist(at(r, Z2));
      status.textContent = t('Iris 1: {a} mm · Iris 2: {b} mm (Ziel: beide unter {t} mm)', { a: num(d1, 2), b: num(d2, 2), t: num(TOL, 2) });
      if (!done && d1 <= TOL && d2 <= TOL) finishRound();
    };

    const turn = (k, sign) => () => {
      if (done) return;
      const th = mirror === 'm1' ? r.th1 : r.th2;
      th[k] += sign * STEP[step] * 1e-3;
      r.clicks += 1;
      showClicks();
      redraw();
    };

    function finishRound() {
      done = true;
      pad.querySelectorAll('button').forEach((b) => { b.disabled = true; });
      const s = r.clicks <= 60 ? 3 : r.clicks <= 120 ? 2 : 1;
      total += s;
      fill(result, 
        verdict(s, t('Justiert mit {n} Drehern.', { n: r.clicks })),
        h('p', { class: 'hint' }, t('Beide Blenden zentriert: Jetzt liegt der Strahl auf der optischen Achse, und nachfolgende Optiken (Scanner, Objektiv) sehen ihn mittig.')),
        h('button', { type: 'button', class: 'btn btn-primary btn-wide', onClick: next }, round === ROUNDS ? t('Auswertung') : t('Nächster Aufbau')),
      );
    }

    const knob = (k, sign, arrow, label) => holdButton({ class: 'pad-btn', 'aria-label': t(label) }, arrow, turn(k, sign));
    const pad = h(
      'div',
      { class: 'dpad', dataset: { noswipe: '1' } },
      h('span'), knob(1, 1, '▲', 'Strahl nach oben'), h('span'),
      knob(0, -1, '◀', 'Strahl nach links'), h('span', { class: 'dpad-mid' }), knob(0, 1, '▶', 'Strahl nach rechts'),
      h('span'), knob(1, -1, '▼', 'Strahl nach unten'), h('span'),
    );

    const choose = segmented([{ id: 'm1', label: 'Spiegel 1' }, { id: 'm2', label: 'Spiegel 2' }], mirror, (id) => { mirror = id; sketch.redraw(); });
    const fine = segmented([{ id: 'grob', label: 'grob' }, { id: 'fein', label: 'fein' }], step, (id) => { step = id; });

    const tip = h('details', { class: 'sim-tasks' }, h('summary', {}, t('Tipp')), h('p', { class: 'small' }, t('Probiere beide Zuordnungen: Spiegel 1 auf Iris 1 und Spiegel 2 auf Iris 2, oder umgekehrt. Bei einer davon wird der Fehler mit jedem Durchgang kleiner.')));

    fill(stage, head(round, ROUNDS, total, clicks), sketchBox, h('div', { class: 'iris-row' }, c1.box, c2.box), status, h('div', { class: 'justage-ctl' }, h('div', { class: 'justage-seg' }, choose, fine), pad), tip, result);
    redraw();
  }

  intro(stage, {
    lead: 'Nach einem Umbau läuft der Strahl schief durch den Aufbau. Mit zwei Spiegeln und zwei Irisblenden bringst du ihn zurück auf die Achse: Position und Winkel.',
    steps: [
      'Laser auf Justageleistung (oder Pilotlaser) stellen.',
      'Zwei Irisblenden auf die Sollachse setzen, eine nah, eine fern.',
      'Mit einem Spiegel auf die eine, mit dem anderen auf die andere Blende zentrieren.',
      'Wiederholen, bis der Strahl durch beide Blenden mittig läuft.',
    ],
    checklist: ['Laserschutzbrille für die Wellenlänge aufgesetzt', 'Leistung auf Justageleistung reduziert', 'Uhr und Ringe abgelegt (Reflexe)', 'Strahlhöhe nicht auf Augenhöhe, Kopf nie in Strahlebene'],
    onStart: start,
  });
}
