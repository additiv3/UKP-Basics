// Interactive calculators. block.modell selects a model below; sliders are logarithmic.
// Models are physics definitions only (no material data); thresholds are free user inputs.
import { h } from '../ui/dom.js';
import { math } from '../core/richtext.js';
import { num, si, sci } from '../core/format.js';
import { t } from '../core/i18n.js';

const HC_EV_NM = 1239.84; // h*c in eV*nm (CODATA, rounded)

const MODELS = {
  fluenz: {
    titel: 'Fluenz- und Intensitätsrechner',
    inputs: [
      { id: 'Ep', label: 'Pulsenergie', unit: 'µJ', min: 0.1, max: 1000, value: 10 },
      { id: 'w0', label: 'Strahlradius w₀ (1/e²)', unit: 'µm', min: 2, max: 100, value: 15 },
      { id: 'tau', label: 'Pulsdauer τ', unit: 'fs', min: 10, max: 10000, value: 300 },
      { id: 'f', label: 'Repetitionsrate', unit: 'kHz', min: 1, max: 10000, value: 100 },
      { id: 'Fth', label: 'Schwellfluenz (frei gewählt, kein Materialwert)', unit: 'J/cm²', min: 0.05, max: 20, value: 1 },
    ],
    compute(v) {
      const Ep = v.Ep * 1e-6; // J
      const tau = v.tau * 1e-15; // s
      const w0cm = v.w0 * 1e-4; // cm
      const F0 = (2 * Ep) / (Math.PI * w0cm ** 2); // J/cm^2
      return [
        { label: 'Spitzenleistung ≈ Eₚ/τ', value: si(Ep / tau, 'W') },
        { label: 'Mittlere Leistung Eₚ·f', value: si(Ep * v.f * 1e3, 'W') },
        { label: 'Spitzenfluenz F₀', value: `${num(F0)} J/cm²` },
        { label: 'Spitzenintensität ≈ F₀/τ', value: `${sci(F0 / tau)} W/cm²` },
        { label: 'Pulsabstand 1/f', value: si(1 / (v.f * 1e3), 's') },
        { label: 'F₀ / F_th', value: num(F0 / v.Fth), bar: F0 / v.Fth },
      ];
    },
    formel: 'F_0=\\frac{2E_\\mathrm{p}}{\\pi w_0^2},\\quad I_0\\approx\\frac{F_0}{\\tau}',
    hinweis: 'Intensität mit rechteckigem Zeitprofil genähert; der Formfaktor des echten Pulses (z. B. ≈0,94 bei sech²) ist vernachlässigt.',
  },
  photon: {
    titel: 'Photonenenergie-Rechner',
    inputs: [
      { id: 'lam', label: 'Wellenlänge λ', unit: 'nm', min: 200, max: 2500, value: 1030 },
      { id: 'Eg', label: 'Bandlücke (frei gewählt)', unit: 'eV', min: 0.5, max: 12, value: 5 },
    ],
    compute(v) {
      const E = HC_EV_NM / v.lam;
      const n = Math.ceil(v.Eg / E);
      return [
        { label: 'Photonenenergie hν', value: `${num(E)} eV` },
        { label: 'Mindestzahl Photonen ⌈E_g / hν⌉', value: String(n) },
        { label: 'Photonen pro Elektron-Loch-Paar', value: n === 1 ? t('lineare Absorption möglich') : t('{n}-Photonen-Prozess nötig', { n }) },
      ];
    },
    formel: 'h\\nu=\\frac{hc}{\\lambda}\\approx\\frac{1239{,}84\\ \\mathrm{eV\\,nm}}{\\lambda},\\quad n_\\mathrm{min}=\\left\\lceil \\frac{E_\\mathrm{g}}{h\\nu}\\right\\rceil',
    hinweis: 'Die Bandlücke ist ein frei gewählter Zahlenwert zum Ausprobieren, keine Materialangabe.',
  },
};

/** slider position t in [0,1] <-> log scale value */
const fromT = (inp, t) => inp.min * (inp.max / inp.min) ** t;
const toT = (inp, v) => Math.log(v / inp.min) / Math.log(inp.max / inp.min);
const round2 = (x) => Number(x.toPrecision(2));

export function render(block) {
  const model = MODELS[block.modell];
  if (!model) return h('div', {}, `Unbekannter Rechner „${block.modell}"`);

  const values = Object.fromEntries(model.inputs.map((i) => [i.id, i.value]));
  const outputs = h('div', { class: 'calc-out' });
  const rows = model.inputs.map((inp) => {
    const readout = h('output', { class: 'calc-val' });
    const slider = h('input', {
      type: 'range',
      min: 0,
      max: 1,
      step: 0.001,
      value: toT(inp, inp.value),
      'aria-label': `${t(inp.label)} (${inp.unit})`,
      onInput: () => {
        values[inp.id] = round2(fromT(inp, Number(slider.value)));
        update();
      },
    });
    const update1 = () => {
      readout.textContent = `${num(values[inp.id], 3)} ${inp.unit}`;
    };
    return { el: h('label', { class: 'calc-row' }, h('span', { class: 'calc-label' }, t(inp.label)), slider, readout), update1 };
  });

  function update() {
    rows.forEach((r) => r.update1());
    outputs.replaceChildren(
      ...model.compute(values).map((o) =>
        h(
          'div',
          { class: 'calc-item' },
          h('span', { class: 'calc-item-label' }, t(o.label)),
          h('strong', {}, o.value),
          o.bar === undefined
            ? null
            : h(
                'div',
                { class: `calc-bar ${o.bar >= 1 ? 'over' : 'under'}`, role: 'img', 'aria-label': o.bar >= 1 ? t('über der gewählten Schwelle') : t('unter der gewählten Schwelle') },
                h('div', { class: 'calc-bar-fill', style: `width:${Math.min(100, (Math.log10(Math.max(o.bar, 0.01)) + 2) * 25)}%` }),
                h('div', { class: 'calc-bar-mark', title: t('Schwelle (Verhältnis 1)') }),
              ),
        ),
      ),
    );
  }
  update();

  return h('div', {}, h('strong', { class: 'callout-title' }, block.titel ?? t(model.titel)), h('div', { class: 'formula small', html: math(model.formel, true) }), ...rows.map((r) => r.el), outputs, h('p', { class: 'hint' }, t(model.hinweis)));
}
