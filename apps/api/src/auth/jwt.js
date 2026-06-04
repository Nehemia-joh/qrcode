import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'dev-only-change-in-production';
const EXPIRES = '12h';

export function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
      role: user.role,
      schoolIds: user.schoolIds,
    },
    SECRET,
    { expiresIn: EXPIRES }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, SECRET);
}
