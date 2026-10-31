import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { User } from '../models/User.js';
import { HttpError, wrap } from '../utils/http.js';

export const signToken = (user, sessionToken) => {
  const payload = { sub: String(user._id) };
  if (sessionToken) payload.sid = sessionToken;
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpires });
};

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

  // Single-session check: non-viewer and non-scorer users must have a matching session token.
  // Viewers and tournament scorers are allowed unlimited concurrent sessions.
  if (user.role !== 'viewer' && user.role !== 'scorer' && user.sessionToken && payload.sid !== user.sessionToken) {
    throw new HttpError(401, 'You have been logged in on another device. Please sign in again');
  }

  // Keep track of user's last active timestamp (throttled to once per minute)
  const now = new Date();
  if (!user.lastActiveAt || (now.getTime() - new Date(user.lastActiveAt).getTime() > 60 * 1000)) {
    User.updateOne({ _id: user._id }, { $set: { lastActiveAt: now } }).exec().catch(() => {});
    user.lastActiveAt = now;
  }

  req.user = user;
  next();
});

export const optionalAuth = wrap(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(payload.sub);
    if (user && user.active) {
      req.user = user;
    }
  } catch {}
  next();
});

export const requireRole = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.user.role)) return next(new HttpError(403, 'You do not have permission to do that'));
  next();
};

export const publicUser = (u) => {
  const lastActive = u.lastActiveAt ? new Date(u.lastActiveAt) : null;
  // Consider user "online" if active within the last 5 minutes
  const isOnline = !!lastActive && (Date.now() - lastActive.getTime() < 5 * 60 * 1000);
  return {
    id: String(u._id),
    name: u.name,
    username: u.username || null,
    phone: u.phone || null,
    email: u.email || null,
    role: u.role,
    active: u.active,
    viewTeam: u.viewTeam ? String(u.viewTeam) : null,
    tournamentId: u.tournamentId ? String(u.tournamentId) : null,
    lastActiveAt: u.lastActiveAt || null,
    lastLoginAt: u.lastLoginAt || null,
    isOnline,
    createdAt: u.createdAt,
  };
};
