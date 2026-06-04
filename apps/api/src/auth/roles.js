export const ROLES = {
  ADMIN: 'admin',
  VIEWER: 'viewer',
  TRANSPORT_MANAGER: 'transport_manager',
  KITCHEN_MANAGER: 'kitchen_manager',
  FACILITIES_MANAGER: 'facilities_manager',
  FARM_MANAGER: 'farm_manager',
};

export const ROLE_LABELS = {
  admin: 'Administrator',
  viewer: 'Viewer',
  transport_manager: 'Transport Manager',
  kitchen_manager: 'Kitchen Manager',
  facilities_manager: 'Facilities Manager',
  farm_manager: 'Farm Manager',
};

export function canEdit(user) {
  return user?.role === ROLES.ADMIN;
}

export function canManageUsers(user) {
  return user?.role === ROLES.ADMIN;
}

export function canAccessSchool(user, schoolId) {
  if (!user) return false;
  if (user.role === ROLES.ADMIN) return true;
  const ids = user.schoolIds;
  if (!ids || ids.includes('*')) return true;
  return ids.includes(schoolId);
}

const ROLE_MODULES = {
  admin: ['overall', 'transport', 'kitchen', 'facilities', 'farm', 'reports', 'admin'],
  viewer: ['overall', 'transport', 'kitchen', 'facilities', 'farm', 'reports'],
  transport_manager: ['overall', 'transport', 'reports'],
  kitchen_manager: ['overall', 'kitchen', 'reports'],
  facilities_manager: ['overall', 'facilities', 'reports'],
  farm_manager: ['overall', 'farm', 'reports'],
};

export function canViewModule(user, moduleKey) {
  if (!user) return false;
  const allowed = ROLE_MODULES[user.role] || ROLE_MODULES.viewer;
  return allowed.includes(moduleKey);
}
