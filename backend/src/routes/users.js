// Super Admin only: see everyone who signed up (with phone numbers) and manage accounts.
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
router.use(requireAuth, requireRole('superadmin'));

const createSchema = z.object({
  ...signupFields,
  role: z.enum(['admin', 'user', 'viewer']).optional().default('user'),
});
const updateSchema = z.object({
  name: signupFields.name.optional(),
  phone: signupFields.phone.optional(),
  password: signupFields.password.optional(),
  role: z.enum(['admin', 'user', 'viewer']).optional(),
  active: z.boolean().optional(),
});

router.get('/', wrap(async (req, res) => {
  const { page, limit, skip } = pageParams(req.query);
  const filter = {};
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(String(req.query.search)), 'i');
    filter.$or = [{ name: rx }, { username: rx }, { phone: rx }, { email: rx }];
  }
  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  const ids = items.map((u) => u._id);
  const owned = await Team.find({ createdBy: { $in: ids } }).select('name createdBy').sort({ name: 1 });
  const byOwner = {};
  owned.forEach((t) => { (byOwner[String(t.createdBy)] ||= []).push({ id: String(t._id), name: t.name }); });
  const viewTeams = await Team.find({ _id: { $in: items.filter((u) => u.viewTeam).map((u) => u.viewTeam) } }).select('name');
  const vm = Object.fromEntries(viewTeams.map((t) => [String(t._id), { id: String(t._id), name: t.name }]));
  res.json({
    items: items.map((u) => ({
      ...publicUser(u),
      teams: byOwner[String(u._id)] || [],
      teamCount: (byOwner[String(u._id)] || []).length,
      viewTeamInfo: u.viewTeam ? vm[String(u.viewTeam)] || null : null,
    })),
    total,
    page,
    pages: Math.ceil(total / limit) || 1,
  });
}));

router.post('/', wrap(async (req, res) => {
  const data = parse(createSchema, req.body);
  await assertUnique(data);
  const user = await User.create({ name: data.name, username: data.username, phone: data.phone, passwordHash: await bcrypt.hash(data.password, 10), role: data.role || 'user' });
  await audit(req.user, 'user.create', 'User', user._id, { username: user.username, phone: user.phone, role: user.role });
  res.status(201).json({ user: publicUser(user) });
}));

router.put('/:id', wrap(async (req, res) => {
  const data = parse(updateSchema, req.body);
  const user = await User.findById(req.params.id);
  if (!user) throw new HttpError(404, 'User not found');
  if (user.role === 'superadmin') throw new HttpError(403, 'The Super Admin account cannot be changed here');
  if (data.phone) await assertUnique({ phone: data.phone }, user._id);
  if (data.name !== undefined) user.name = data.name;
  if (data.phone !== undefined) user.phone = data.phone;
  if (data.role !== undefined) user.role = data.role;
  if (data.active !== undefined) user.active = data.active;
  if (data.password) user.passwordHash = await bcrypt.hash(data.password, 10);
  await user.save();
  const { password, ...safe } = data;
  await audit(req.user, 'user.update', 'User', user._id, { ...safe, passwordChanged: !!password });
  res.json({ user: publicUser(user) });
}));

router.delete('/:id', wrap(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new HttpError(404, 'User not found');
  if (user.role === 'superadmin') throw new HttpError(403, 'The Super Admin account cannot be deleted');
  await user.deleteOne();
  await audit(req.user, 'user.delete', 'User', user._id, { username: user.username, phone: user.phone });
  res.json({ ok: true });
}));

export default router;
