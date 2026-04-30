// Input:  Webpack project using require.context for dynamic module loading
// Output: Equivalent Vite pattern using import.meta.glob

// ============================================================
// BEFORE: Webpack require.context (auto-import all route modules)
// ============================================================
// const routeModules = require.context('./routes', true, /\.tsx$/);
// const routes = routeModules.keys().map(key => ({
//   path: key.replace('./', '/').replace('.tsx', ''),
//   component: routeModules(key).default,
// }));

// ============================================================
// AFTER: Vite import.meta.glob (eager loading equivalent)
// ============================================================
const routeModules = import.meta.glob<{ default: React.ComponentType }>(
  './routes/**/*.tsx',
  { eager: true }
);

const routes = Object.entries(routeModules).map(([path, module]) => ({
  path: path
    .replace('./routes', '')
    .replace('.tsx', '')
    .replace('/index', '/'),
  component: module.default,
}));

// ============================================================
// AFTER: Vite import.meta.glob (lazy loading for code splitting)
// ============================================================
const lazyRouteModules = import.meta.glob<{ default: React.ComponentType }>(
  './routes/**/*.tsx'
);

const lazyRoutes = Object.entries(lazyRouteModules).map(([path, loader]) => ({
  path: path.replace('./routes', '').replace('.tsx', '').replace('/index', '/'),
  lazy: async () => {
    const module = await loader();
    return { Component: module.default };
  },
}));
