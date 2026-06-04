import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { ROLES, ROLE_LABELS } from './roles.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../../../data');
const USERS_FILE = join(DATA_DIR, 'ops-users.json');

const VALID_ROLES = Object.values(ROLES);

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function loadUsers() {
  ensureDataDir();
  if (!existsSync(USERS_FILE)) return [];
  return JSON.parse(readFileSync(USERS_FILE, 'utf8'));
}

function saveUsers(users) {
  ensureDataDir();
  writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

export function seedAdminIfEmpty() {
  const users = loadUsers();
  if (users.length > 0) return null;

  const username = process.env.OPS_ADMIN_USERNAME || 'admin';
  const password = process.env.OPS_ADMIN_PASSWORD || 'admin123';
  const hash = bcrypt.hashSync(password, 10);
  const admin = {
    id: randomUUID(),
    username,
    passwordHash: hash,
    email: 'admin@silverleaf.ac.tz',
    fullName: 'Operations Administrator',
    role: ROLES.ADMIN,
    schoolIds: ['*'],
    status: 'active',
    createdAt: new Date().toISOString(),
  };
  saveUsers([admin]);
  console.log(`[auth] Seeded admin user "${username}" (change password after first login)`);
  return admin;
}

export function findByUsername(username) {
  return loadUsers().find((u) => u.username === username && u.status === 'active') ?? null;
}

export function findById(id) {
  return loadUsers().find((u) => u.id === id && u.status === 'active') ?? null;
}

export function verifyPassword(user, password) {
  return bcrypt.compareSync(password, user.passwordHash);
}

export function toPublicUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    roleLabel: ROLE_LABELS[user.role] || user.role,
    schoolIds: user.schoolIds,
    canEdit: user.role === ROLES.ADMIN,
  };
}

export function listUsers() {
  return loadUsers()
    .filter((u) => u.status === 'active')
    .map(toPublicUser);
}

export function createUser({ username, password, email, fullName, role, schoolIds }) {
  const users = loadUsers();
  if (users.some((u) => u.username === username)) {
    throw new Error('Username already exists');
  }
  if (!VALID_ROLES.includes(role)) {
    throw new Error(`Invalid role. Use: ${VALID_ROLES.join(', ')}`);
  }
  const user = {
    id: randomUUID(),
    username,
    passwordHash: bcrypt.hashSync(password, 10),
    email: email || `${username}@silverleaf.ac.tz`,
    fullName: fullName || username,
    role,
    schoolIds: schoolIds?.length ? schoolIds : ['*'],
    status: 'active',
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  saveUsers(users);
  return toPublicUser(user);
}

export function updateUser(id, patch) {
  const users = loadUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx < 0) throw new Error('User not found');

  if (patch.username && users.some((u, i) => i !== idx && u.username === patch.username)) {
    throw new Error('Username already exists');
  }
  if (patch.role && !VALID_ROLES.includes(patch.role)) {
    throw new Error('Invalid role');
  }

  const u = users[idx];
  if (patch.username) u.username = patch.username;
  if (patch.email) u.email = patch.email;
  if (patch.fullName) u.fullName = patch.fullName;
  if (patch.role) u.role = patch.role;
  if (patch.schoolIds) u.schoolIds = patch.schoolIds;
  if (patch.password) u.passwordHash = bcrypt.hashSync(patch.password, 10);
  if (patch.status) u.status = patch.status;

  users[idx] = u;
  saveUsers(users);
  return toPublicUser(u);
}
