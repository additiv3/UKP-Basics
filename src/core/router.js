// Hash router: '#/kapitel/k01/k01.l02' -> view with params {id, lektion}.
const routes = [];

export function route(pattern, view, tab) {
  const keys = [];
  const re = new RegExp(
    '^' +
      pattern.replace(/:([a-z]+)/g, (_, k) => {
        keys.push(k);
        return '([^/]+)';
      }) +
      '/?$',
  );
  routes.push({ re, keys, view, tab });
}

export const currentPath = () => decodeURIComponent(location.hash.replace(/^#/, '') || '/');

export function match(path) {
  for (const r of routes) {
    const m = r.re.exec(path);
    if (m) return { view: r.view, tab: r.tab, params: Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])])) };
  }
  return null;
}

export function start(onRoute) {
  const run = () => onRoute(match(currentPath()), currentPath());
  window.addEventListener('hashchange', run);
  run();
}

export function go(path) {
  location.hash = '#' + path;
}
