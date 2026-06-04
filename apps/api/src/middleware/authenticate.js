import { verifyToken } from '../auth/jwt.js';
import { findById, toPublicUser } from '../auth/userStore.js';

export function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Login required.' });
  }

  try {
    const payload = verifyToken(token);
    const user = findById(payload.sub);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'User not found or inactive.' });
    }
    req.user = toPublicUser(user);
    req.userRole = user.role;
    req.canEdit = req.user.canEdit;
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized', message: 'Session expired. Please log in again.' });
  }
}
