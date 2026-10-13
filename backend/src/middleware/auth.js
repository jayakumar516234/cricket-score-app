import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { User } from '../models/User.js';
import { HttpError, wrap } from '../utils/http.js';

export const signToken = (user) => jwt.sign({ sub: String(user._id) }, config.jwtSecret, { expiresIn: config.jwtExpires });

export const requireAuth = wrap(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new HttpError(401, 'Please sign in');
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw new HttpError(401, 'Your session has expired. Please sign in again');
  }
  const user = await User.findById(payload.sub);
  if (!user || !user.active) throw new HttpError(401, 'Account not found or disabled');
  req.user = user;
  next();
});

export const requireRole = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.user.role)) return next(new HttpError(403, 'You do not have permission to do that'));
  next();
};

export const publicUser = (u) => ({
  id: String(u._id),
  name: u.name,
  username: u.username || null,
  phone: u.phone || null,
  email: u.email || null,
  role: u.role,
  active: u.active,
  viewTeam: u.viewTeam ? String(u.viewTeam) : null,
  createdAt: u.createdAt,
});
