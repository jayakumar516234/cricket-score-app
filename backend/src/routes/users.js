// Super Admin and Admin: manage accounts and track user activity.
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/User.js';
import { Team } from '../models/Team.js';
import { requireAuth, requireRole, publicUser } from '../middleware/auth.js';
import { HttpError, parse, wrap, escapeRegex, pageParams } from '../utils/http.js';
import { audit } from '../utils/audit.js';
import { signupFields, assertUnique } from './auth.js';

const router = Router();
router.use(requireAuth, requireRole('superadmin', 'admin'));

const createSchema = z.object({
  ...signupFields,
  role: z.enum(['admin', 'teamadmin', 'user', 'viewer']).optional().default('user'),
  viewTeam: z.string().optional().nullable(),
  assignTeam: z.string().optional().nullable(),
});

const updateSchema = z.object({
  name: signupFields.name.optional(),
  username: signupFields.username.optional(),
  phone: signupFields.phone.optional(),
  password: signupFields.password.optional(),
  role: z.enum(['admin', 'teamadmin', 'user', 'viewer']).optional(),
  active: z.boolean().optional(),
  viewTeam: z.string().optional().nullable(),
  assignTeam: z.string().optional().nullable(),
});

// Lightweight teams list for dropdowns when creating/editing users
router.get('/teams-list', wrap(async (_req, res) => {
  const teams = await Team.find({ isGuest: { $ne: true } })
    .select('name code location createdBy')
    .sort({ name: 1 })
    .lean();
  res.json({
    teams: teams.map((t) => ({
      id: String(t._id),
      name: t.name,
      code: t.code,
      location: t.location,
      createdBy: t.createdBy ? String(t.createdBy) : null,
    })),
  });
}));

router.get('/', wrap(async (req, res) => {
  const { page, limit, skip } = pageParams(req.query);
  const filter = {};
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(String(req.query.search)), 'i');
    filter.$or = [{ name: rx }, { username: rx }, { phone: rx }, { email: rx }];
  }
  if (req.query.online === 'true') {
    filter.lastActiveAt = { $gte: new Date(Date.now() - 5 * 60 * 1000) };
  }
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
  const [items, total, onlineTotal] = await Promise.all([
    User.find(filter).sort({ lastActiveAt: -1, createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
    User.countDocuments({ lastActiveAt: { $gte: fiveMinAgo } }),
  ]);
  const ids = items.map((u) => u._id);
  const owned = await Team.find({ createdBy: { $in: ids } }).select('name createdBy').sort({ name: 1 });
  const byOwner = {};
  owned.forEach((t) => { (byOwner[String(t.createdBy)] ||= []).push({ id: String(t._id), name: t.name }); });
  const viewTeams = await Team.find({ _id: { $in: items.filter((u) => u.viewTeam).map((u) => u.viewTeam) } }).select('name code');
  const vm = Object.fromEntries(viewTeams.map((t) => [String(t._id), { id: String(t._id), name: t.name, code: t.code }]));
  res.json({
    items: items.map((u) => ({
      ...publicUser(u),
      teams: byOwner[String(u._id)] || [],
      teamCount: (byOwner[String(u._id)] || []).length,
      viewTeamInfo: u.viewTeam ? vm[String(u.viewTeam)] || null : null,
    })),
    total,
    onlineTotal,
    page,
    pages: Math.ceil(total / limit) || 1,
  });
}));

router.post('/', wrap(async (req, res) => {
  const data = parse(createSchema, req.body);
  if (req.user.role !== 'superadmin' && data.role === 'admin') {
    throw new HttpError(403, 'Only Super Admin can create Admin accounts');
  }
  await assertUnique(data);
  const user = await User.create({
    name: data.name,
    username: data.username,
    phone: data.phone,
    passwordHash: await bcrypt.hash(data.password, 10),
    role: data.role || 'user',
    viewTeam: data.role === 'viewer' && data.viewTeam ? data.viewTeam : null,
  });

  if (data.assignTeam && (user.role === 'user' || user.role === 'teamadmin')) {
    await Team.updateOne({ _id: data.assignTeam }, { $set: { createdBy: user._id } });
  }

  await audit(req.user, 'user.create', 'User', user._id, { username: user.username, phone: user.phone, role: user.role });
  res.status(201).json({ user: publicUser(user) });
}));

router.put('/:id', wrap(async (req, res) => {
  const data = parse(updateSchema, req.body);
  const user = await User.findById(req.params.id);
  if (!user) throw new HttpError(404, 'User not found');
  if (user.role === 'superadmin') throw new HttpError(403, 'The Super Admin account cannot be changed here');
  if (req.user.role !== 'superadmin' && user.role === 'admin') {
    throw new HttpError(403, 'Only Super Admin can edit Admin accounts');
  }
  if (req.user.role !== 'superadmin' && data.role === 'admin') {
    throw new HttpError(403, 'Only Super Admin can assign Admin role');
  }
  if (data.username && data.username !== user.username) {
    await assertUnique({ username: data.username }, user._id);
    user.username = data.username;
  }
  if (data.phone && data.phone !== user.phone) {
    await assertUnique({ phone: data.phone }, user._id);
    user.phone = data.phone;
  }
  if (data.name !== undefined) user.name = data.name;
  if (data.role !== undefined) user.role = data.role;
  if (data.active !== undefined) user.active = data.active;
  if (data.password) user.passwordHash = await bcrypt.hash(data.password, 10);
  if (data.viewTeam !== undefined) {
    user.viewTeam = data.viewTeam || null;
  }
  await user.save();

  if (data.assignTeam && (user.role === 'user' || user.role === 'teamadmin')) {
    await Team.updateOne({ _id: data.assignTeam }, { $set: { createdBy: user._id } });
  }

  const { password, ...safe } = data;
  await audit(req.user, 'user.update', 'User', user._id, { ...safe, passwordChanged: !!password });
  res.json({ user: publicUser(user) });
}));

router.delete('/:id', wrap(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new HttpError(404, 'User not found');
  if (user.role === 'superadmin') throw new HttpError(403, 'The Super Admin account cannot be deleted');
  if (req.user.role !== 'superadmin' && user.role === 'admin') {
    throw new HttpError(403, 'Only Super Admin can delete Admin accounts');
  }
  await user.deleteOne();
  await audit(req.user, 'user.delete', 'User', user._id, { username: user.username, phone: user.phone });
  res.json({ ok: true });
}));

export default router;
