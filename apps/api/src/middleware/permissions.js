import { canManageUsers, canEdit, canAccessSchool } from '../auth/roles.js';

export function requireAdmin(req, res, next) {
  if (!req.user || !canEdit(req.user)) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Only administrators can create or edit data.',
    });
  }
  next();
}

export function requireUserAdmin(req, res, next) {
  if (!req.user || !canManageUsers(req.user)) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Only administrators can manage users.',
    });
  }
  next();
}

export function requireSchoolAccess(req, res, next) {
  const schoolId = req.query.schoolId || req.body?.schoolId;
  if (schoolId && !canAccessSchool(req.user, schoolId)) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'You do not have access to this school.',
    });
  }
  next();
}

export function attachPermissions(req, _res, next) {
  req.userRole = req.user?.role ?? null;
  req.canEdit = req.user?.canEdit ?? false;
  next();
}
