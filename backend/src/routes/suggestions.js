import { Router } from 'express';
import { z } from 'zod';
import { Suggestion } from '../models/Suggestion.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { HttpError, parse, wrap, pageParams } from '../utils/http.js';

const router = Router();

const createSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(200),
  message: z.string().trim().min(5, 'Message must be at least 5 characters').max(2000),
});

const updateSchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  message: z.string().trim().min(5).max(2000).optional(),
  status: z.enum(['pending', 'reviewed', 'accepted', 'rejected']).optional(),
  adminReply: z.string().trim().max(2000).optional(),
});

// GET /api/suggestions — admin sees all, users/viewers see only their own
router.get('/', requireAuth, wrap(async (req, res) => {
  const { page, limit, skip } = pageParams(req.query);
  const filter = req.user.role === 'superadmin' ? {} : { user: req.user._id };
  if (req.query.status) filter.status = req.query.status;
  const [items, total] = await Promise.all([
    Suggestion.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Suggestion.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) || 1 });
}));

// POST /api/suggestions — any logged-in user can submit
router.post('/', requireAuth, wrap(async (req, res) => {
  const data = parse(createSchema, req.body);
  const suggestion = await Suggestion.create({
    ...data,
    user: req.user._id,
    userName: req.user.name,
    userRole: req.user.role,
  });
  res.status(201).json(suggestion);
}));

// PUT /api/suggestions/:id — admin can edit any, users can only edit their own (title/message only, while pending)
router.put('/:id', requireAuth, wrap(async (req, res) => {
  const suggestion = await Suggestion.findById(req.params.id);
  if (!suggestion) throw new HttpError(404, 'Suggestion not found');

  if (req.user.role === 'superadmin') {
    const data = parse(updateSchema, req.body);
    Object.assign(suggestion, data);
  } else {
    if (String(suggestion.user) !== String(req.user._id)) throw new HttpError(403, 'You can only edit your own suggestions');
    if (suggestion.status !== 'pending') throw new HttpError(400, 'You can only edit pending suggestions');
    const data = parse(createSchema, req.body);
    suggestion.title = data.title;
    suggestion.message = data.message;
  }
  await suggestion.save();
  res.json(suggestion);
}));

// DELETE /api/suggestions/:id — admin only
router.delete('/:id', requireAuth, requireRole('superadmin'), wrap(async (req, res) => {
  const suggestion = await Suggestion.findByIdAndDelete(req.params.id);
  if (!suggestion) throw new HttpError(404, 'Suggestion not found');
  res.json({ ok: true });
}));

export default router;
