import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { wrap } from '../utils/http.js';
import { AppConfig, DEFAULT_MENU_VISIBILITY, ALL_MENU_KEYS } from '../models/AppConfig.js';
import { audit } from '../utils/audit.js';

const router = Router();

// All roles that can be configured
const ROLES = ['superadmin', 'admin', 'teamadmin', 'user', 'viewer'];

// GET /api/config/menu-visibility  — superadmin only
router.get('/menu-visibility', requireAuth, requireRole('superadmin'), wrap(async (req, res) => {
  const doc = await AppConfig.findOne({ configKey: 'menu_visibility' }).lean();
  const visibility = doc?.value ?? DEFAULT_MENU_VISIBILITY;
  res.json({ visibility, allKeys: ALL_MENU_KEYS, roles: ROLES });
}));

// PUT /api/config/menu-visibility  — superadmin only
router.put('/menu-visibility', requireAuth, requireRole('superadmin'), wrap(async (req, res) => {
  const { visibility } = req.body;
  if (!visibility || typeof visibility !== 'object') {
    return res.status(400).json({ error: 'visibility object is required' });
  }

  // Validate: each role key must have an array of valid menu keys
  for (const role of ROLES) {
    if (!Array.isArray(visibility[role])) {
      return res.status(400).json({ error: `Missing or invalid visibility for role: ${role}` });
    }
    // Filter to only valid keys (ignore unknown)
    visibility[role] = visibility[role].filter((k) => ALL_MENU_KEYS.includes(k));
  }

  // Superadmin always sees everything — enforce this
  visibility['superadmin'] = [...ALL_MENU_KEYS];

  await AppConfig.findOneAndUpdate(
    { configKey: 'menu_visibility' },
    { $set: { value: visibility, updatedBy: req.user._id } },
    { upsert: true, new: true }
  );

  await audit(req.user, 'config.menu_visibility.update', 'AppConfig', null, { visibility });
  res.json({ ok: true, visibility });
}));

// GET /api/config/menu-visibility/public  — any authenticated user (to load their own visible keys)
router.get('/menu-visibility/public', requireAuth, wrap(async (req, res) => {
  const doc = await AppConfig.findOne({ configKey: 'menu_visibility' }).lean();
  const all = doc?.value ?? DEFAULT_MENU_VISIBILITY;
  const role = req.user.role;
  // Map scorer → viewer for menu purposes
  const effectiveRole = role === 'scorer' ? 'viewer' : role;
  const visibleKeys = all[effectiveRole] ?? all['user'] ?? ALL_MENU_KEYS;
  res.json({ visibleKeys });
}));

export default router;
