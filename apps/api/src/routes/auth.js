import { Router } from 'express';
import {
  findByUsername,
  verifyPassword,
  toPublicUser,
  seedAdminIfEmpty,
  updateUser,
  findById,
} from '../auth/userStore.js';
import { signToken } from '../auth/jwt.js';
import { authenticate } from '../middleware/authenticate.js';

export const authRouter = Router();

seedAdminIfEmpty();

authRouter.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const user = findByUsername(username.trim());
  if (!user || !verifyPassword(user, password)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const publicUser = toPublicUser(user);
  const token = signToken(user);
  res.json({
    token,
    user: publicUser,
    expiresIn: '12h',
  });
});

authRouter.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

authRouter.post('/change-password', authenticate, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }
  const user = findById(req.user.id);
  if (!user || !verifyPassword(user, currentPassword)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  updateUser(user.id, { password: newPassword });
  res.json({ ok: true, message: 'Password updated' });
});
