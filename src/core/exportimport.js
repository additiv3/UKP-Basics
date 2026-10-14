// Export/import of learner state as JSON (iOS may evict local storage, so backups matter).
import { SCHEMA, migrate } from './store.js';
import { isDay } from './dates.js';

const APP = 'UKP-Basics';

export function buildExport(state, appVersion) {
  return { app: APP, schema: SCHEMA, version: appVersion, exportedAt: new Date().toISOString(), data: state };
}

const isNum = (x) => typeof x === 'number' && Number.isFinite(x);

function validItem(it) {
  return it && isNum(it.ef) && isNum(it.rep) && isNum(it.int) && isDay(it.due) && it.ef >= 1.3;
}

/** Parse and validate an export file. Returns the cleaned state; throws Error with a German message. */
export function parseImport(text) {
  let obj;
  try {
    obj = JSON.parse(text);
  } catch {
    throw new Error('Die Datei ist kein gültiges JSON.');
  }
  if (!obj || obj.app !== APP) throw new Error('Die Datei stammt nicht aus UKP-Basics.');
  if (!isNum(obj.schema) || obj.schema > SCHEMA) throw new Error('Die Datei stammt aus einer neueren App-Version.');
  if (!obj.data || typeof obj.data !== 'object') throw new Error('Die Datei enthält keine Lerndaten.');
  const data = migrate(obj.data);
  for (const [id, it] of Object.entries(data.items)) if (!validItem(it)) delete data.items[id];
  for (const day of Object.keys(data.days)) if (!isDay(day)) delete data.days[day];
  return data;
}

/** Merge two states: per item the more recently reviewed one wins; days take the larger value. */
export function mergeStates(local, incoming) {
  const out = migrate(JSON.parse(JSON.stringify(local)));
  for (const [id, it] of Object.entries(incoming.items)) {
    const cur = out.items[id];
    if (!cur || (it.last ?? '') > (cur.last ?? '')) out.items[id] = it;
  }
  for (const [day, d] of Object.entries(incoming.days)) {
    const cur = out.days[day];
    out.days[day] = cur ? { xp: Math.max(cur.xp, d.xp), n: Math.max(cur.n, d.n) } : d;
  }
  for (const [id, l] of Object.entries(incoming.lessons)) {
    const cur = out.lessons[id];
    if (!cur || l.done < cur.done) out.lessons[id] = l;
  }
  out.unlocked = [...new Set([...out.unlocked, ...incoming.unlocked])];
  const created = [local.profile.created, incoming.profile.created].filter(isDay).sort();
  if (created.length) out.profile.created = created[0];
  return out;
}

export function exportFileName(date = new Date()) {
  return `ukp-basics-fortschritt-${date.toISOString().slice(0, 10)}.json`;
}

/** Share sheet on iOS if file sharing works, otherwise a classic download. Returns 'shared' | 'downloaded'. */
export async function deliverExport(payload) {
  const text = JSON.stringify(payload, null, 2);
  const name = exportFileName();
  const file = new File([text], name, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'UKP-Basics Fortschritt' });
      return 'shared';
    } catch (e) {
      if (e?.name === 'AbortError') throw e;
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return 'downloaded';
}
