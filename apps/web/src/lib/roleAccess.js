/** Mirrors apps/api/src/auth/roles.js — which nav modules each role sees */
const ROLE_MODULES = {
  admin: ['/', '/transport', '/kitchen', '/facilities', '/farm', '/reports', '/data-sources'],
  viewer: ['/', '/transport', '/kitchen', '/facilities', '/farm', '/reports', '/data-sources'],
  transport_manager: ['/', '/transport', '/reports'],
  kitchen_manager: ['/', '/kitchen', '/reports'],
  facilities_manager: ['/', '/facilities', '/reports'],
  farm_manager: ['/', '/farm', '/reports'],
};

export function canAccessPath(role, path) {
  if (role === 'admin') return true;
  const allowed = ROLE_MODULES[role] || ROLE_MODULES.viewer;
  if (path.startsWith('/facilities')) return allowed.includes('/facilities');
  if (path.startsWith('/transport')) return allowed.includes('/transport');
  if (path.startsWith('/kitchen')) return allowed.includes('/kitchen');
  if (path.startsWith('/farm')) return allowed.includes('/farm');
  if (path === '/reports') return allowed.includes('/reports');
  if (path === '/data-sources') return allowed.includes('/data-sources');
  if (path.startsWith('/transport')) return allowed.includes('/transport');
  if (path === '/' || path.startsWith('/admin') || path === '/settings') {
    return path === '/' || path === '/settings' || role === 'admin';
  }
  return true;
}

export function filterNavForRole(role, navItems) {
  return navItems.filter((item) => {
    if (item.to === '/') return true;
    if (item.to === '/reports') return (ROLE_MODULES[role] || ROLE_MODULES.viewer).includes('/reports');
    return (ROLE_MODULES[role] || ROLE_MODULES.viewer).includes(item.to);
  });
}
