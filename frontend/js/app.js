import { Camera } from './camera.js';
import { analyzePlate, ApiError } from './api.js';

const $ = (id) => document.getElementById(id);
const stage = $('stage');
const camera = new Camera($('preview'), $('frame'));

// Bar scaling: fixed reference of one meal's worth, so bars are comparable between scans.
const FULL_SCALE = { protein: 60, carbs: 120, fat: 45 };

const ui = {
  state(s) { stage.dataset.state = s; $('btnShoot').disabled = s === 'busy'; },
  toast(msg) {
    const t = $('toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(t._t); t._t = setTimeout(() => (t.hidden = true), 4200);
  },
  meta(text) { $('hudMeta').textContent = text; },
  clear() {
    ['Protein', 'Carbs', 'Fat'].forEach((k) => {
      $(`v${k}`).textContent = '—';
      $(`b${k}`).style.width = '0%';
    });
    $('vKcal').textContent = '—';
    $('items').innerHTML = '';
    $('disclosure').textContent = '';
    $('latency').textContent = '';
    $('readoutTitle').textContent = 'Ready';
    ui.state('idle');
  },
  render(data, ms) {
    const t = data.totals;
    const set = (k, key) => {
      $(`v${k}`).textContent = t[key].toFixed(1);
      $(`b${k}`).style.width = `${Math.min(100, (t[key] / FULL_SCALE[key]) * 100).toFixed(1)}%`;
    };
    set('Protein', 'protein'); set('Carbs', 'carbs'); set('Fat', 'fat');
    $('vKcal').textContent = Math.round(t.calories);
    $('readoutTitle').textContent = data.items.length
      ? `${data.items.length} item${data.items.length > 1 ? 's' : ''} on the plate`
      : 'Nothing recognised';

    $('items').innerHTML = data.items
      .map((i) => `<li><span>${i.name.replace(/_/g, ' ')}</span><span>${Math.round(i.mass_g)} g · ${(i.confidence * 100).toFixed(0)}%</span></li>`)
      .join('');

    $('latency').textContent = `${ms} ms · ${data.source}`;
    $('disclosure').textContent = data.items.length
      ? 'Mass is estimated from segmented area and food density. Treat values as approximate.'
      : 'Move closer, raise the light, and keep the plate flat in frame.';
    ui.state('done');
  },
};

async function boot() {
  try {
    const s = await camera.start();
    ui.meta(`${s.width || '?'}×${s.height || '?'}`);
  } catch (err) {
    ui.meta('no camera');
    ui.toast(err.message);
  }
}

async function scan() {
  if (!camera.active) return boot();
  ui.state('busy');
  $('readoutTitle').textContent = 'Analysing frame';
  const t0 = performance.now();
  try {
    const { blob } = await camera.capture();
    const data = await analyzePlate(blob, { referenceWidthMm: 85.6 }); // ID-1 card as fiducial
    ui.render(data, Math.round(performance.now() - t0));
  } catch (err) {
    ui.state('idle');
    $('readoutTitle').textContent = 'Scan failed';
    ui.toast(err instanceof ApiError ? err.message : err.message || 'Something went wrong.');
  }
}

$('btnShoot').addEventListener('click', scan);
$('btnReset').addEventListener('click', () => ui.clear());
$('btnFlip').addEventListener('click', async () => {
  try { const s = await camera.flip(); ui.meta(`${s.width}×${s.height}`); }
  catch (e) { ui.toast(e.message); }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) camera.stop();
  else if (stage.dataset.state !== 'busy') boot();
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}

boot();
