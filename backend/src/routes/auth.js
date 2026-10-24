import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { User } from '../models/User.js';
import { requireAuth, signToken, publicUser } from '../middleware/auth.js';
import { HttpError, parse, wrap } from '../utils/http.js';
import { normalizePhone, isValidPhone, USERNAME_RE } from '../utils/identity.js';
import { config } from '../config.js';
import { audit } from '../utils/audit.js';

const router = Router();
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.nodeEnv === 'test',
  message: { error: 'Too many attempts. Please try again in a few minutes' },
});

const loginSchema = z.object({
  identifier: z.string({ required_error: 'Enter your username or phone number' }).trim().min(1, 'Enter your username or phone number'),
  password: z.string().min(1, 'Password is required'),
});

export const signupFields = {
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  username: z.string().trim().toLowerCase()
    .regex(USERNAME_RE, 'Username must be 3-30 characters: letters, numbers, dot or underscore')
    .regex(/[a-z]/, 'Username must contain at least one letter'),
  phone: z.string().trim().transform(normalizePhone).refine(isValidPhone, 'Enter a valid 10-digit mobile number'),
  password: z.string().min(4, 'Password must be at least 4 characters').max(100),
};
const registerSchema = z.object(signupFields);

export async function assertUnique({ username, phone }, exceptId) {
  const other = (q) => User.exists(exceptId ? { ...q, _id: { $ne: exceptId } } : q);
  if (username && (await other({ username }))) throw new HttpError(409, 'This username is already taken');
  if (phone && (await other({ phone }))) throw new HttpError(409, 'This phone number is already registered');
}

// Login with username OR phone number (the Super Admin can also use an email address).
router.post('/login', limiter, wrap(async (req, res) => {
  const { identifier, password } = parse(loginSchema, { identifier: req.body?.identifier ?? req.body?.email, password: req.body?.password });
  const id = identifier.toLowerCase();
  const phone = normalizePhone(identifier);
  const or = [{ username: id }, { email: id }];
  if (isValidPhone(phone)) or.push({ phone });
  const user = await User.findOne({ $or: or }).select('+passwordHash');
  const ok = user && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) throw new HttpError(401, 'Incorrect username/phone number or password');
  if (!user.active) throw new HttpError(403, 'This account is disabled');

  // Single-session: generate a new session token for non-viewer users.
  // Viewers skip this so multiple people can share the same view-only login.
  let sessionToken = '';
  if (user.role !== 'viewer') {
    sessionToken = crypto.randomBytes(16).toString('hex');
    user.sessionToken = sessionToken;
  }
  const now = new Date();
  user.lastLoginAt = now;
  user.lastActiveAt = now;
  await user.save();

  res.json({ token: signToken(user, sessionToken), user: publicUser(user) });
}));

// Public registration is disabled; available only in test environment.
router.post('/register', limiter, wrap(async (req, res) => {
  if (process.env.NODE_ENV !== 'test') {
    throw new HttpError(403, 'Public registration is currently disabled');
  }
  const data = parse(registerSchema, req.body);
  await assertUnique(data);
  const sessionToken = crypto.randomBytes(16).toString('hex');
  const user = await User.create({ name: data.name, username: data.username, phone: data.phone, passwordHash: await bcrypt.hash(data.password, 10), role: 'user', sessionToken });
  res.status(201).json({ token: signToken(user, sessionToken), user: publicUser(user) });
}));

router.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

// Update logged in user profile (name, username, phone)
const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80).optional(),
  username: z.string().trim().toLowerCase()
    .regex(USERNAME_RE, 'Username must be 3-30 characters: letters, numbers, dot or underscore')
    .regex(/[a-z]/, 'Username must contain at least one letter').optional(),
  phone: z.string().trim().transform(normalizePhone).refine(isValidPhone, 'Enter a valid 10-digit mobile number').optional(),
});

router.put('/profile', requireAuth, wrap(async (req, res) => {
  const data = parse(updateProfileSchema, req.body);
  const user = await User.findById(req.user._id);
  if (!user) throw new HttpError(404, 'User not found');

  if (data.username || data.phone) {
    await assertUnique({ username: data.username, phone: data.phone }, user._id);
  }

  if (data.name) user.name = data.name;
  if (data.username) user.username = data.username;
  if (data.phone) user.phone = data.phone;

  await user.save();
  await audit(req.user, 'user.profile.update', 'User', user._id, { name: user.name, username: user.username });
  res.json({ user: publicUser(user) });
}));

// Change password for logged in user
const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(4, 'New password must be at least 4 characters').max(100),
});

router.put('/password', requireAuth, wrap(async (req, res) => {
  const data = parse(updatePasswordSchema, req.body);
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!user) throw new HttpError(404, 'User not found');

  const valid = await bcrypt.compare(data.currentPassword, user.passwordHash);
  if (!valid) throw new HttpError(400, 'Current password is incorrect');

  user.passwordHash = await bcrypt.hash(data.newPassword, 10);
  const sessionToken = crypto.randomBytes(16).toString('hex');
  user.sessionToken = sessionToken;
  await user.save();

  await audit(req.user, 'user.password.change', 'User', user._id);
  res.json({ ok: true, token: signToken(user, sessionToken), message: 'Password updated successfully' });
}));

// Delete own account
const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password is required to confirm account deletion'),
});

router.delete('/account', requireAuth, wrap(async (req, res) => {
  const data = parse(deleteAccountSchema, req.body);
  if (req.user.role === 'superadmin') {
    throw new HttpError(403, 'The Super Admin account cannot be deleted');
  }

  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!user) throw new HttpError(404, 'User not found');

  const valid = await bcrypt.compare(data.password, user.passwordHash);
  if (!valid) throw new HttpError(400, 'Incorrect password');

  await audit(req.user, 'user.account.delete', 'User', user._id, { username: user.username });
  await user.deleteOne();

  res.json({ ok: true, message: 'Account deleted successfully' });
}));

export default router;
