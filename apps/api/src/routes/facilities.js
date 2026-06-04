import { Router } from 'express';
import { resolveSchoolId } from '../data/schools.js';
import { requireAdmin } from '../middleware/permissions.js';
import {
  listAssets,
  getAsset,
  getAssetByTag,
  createAsset,
  updateAsset,
  getAssetQrDataUrl,
  CONDITIONS,
} from '../services/assetsStore.js';
import {
  listMaintenance,
  createMaintenance,
  updateMaintenance,
  STATUSES as MAINT_STATUSES,
  PRIORITIES,
} from '../services/maintenanceStore.js';

export const facilitiesRouter = Router();

facilitiesRouter.get('/assets', (req, res) => {
  const schoolId = resolveSchoolId(req.query.schoolId);
  res.json({ assets: listAssets(schoolId), conditions: CONDITIONS });
});

facilitiesRouter.get('/assets/scan/:tag', (req, res) => {
  const asset = getAssetByTag(req.params.tag);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });
  res.json({ asset });
});

facilitiesRouter.get('/assets/:id', async (req, res) => {
  const asset = getAsset(req.params.id);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });
  const qrDataUrl = await getAssetQrDataUrl(asset);
  res.json({ asset, qrDataUrl });
});

facilitiesRouter.post('/assets', requireAdmin, async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req.body.schoolId);
    const asset = await createAsset({ ...req.body, schoolId });
    const qrDataUrl = await getAssetQrDataUrl(asset);
    res.status(201).json({ asset, qrDataUrl });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

facilitiesRouter.patch('/assets/:id', requireAdmin, (req, res) => {
  try {
    const asset = updateAsset(req.params.id, req.body);
    res.json({ asset });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

facilitiesRouter.get('/maintenance', (req, res) => {
  const schoolId = resolveSchoolId(req.query.schoolId);
  res.json({
    tickets: listMaintenance({
      schoolId,
      assetId: req.query.assetId,
      status: req.query.status,
    }),
    statuses: MAINT_STATUSES,
    priorities: PRIORITIES,
  });
});

facilitiesRouter.post('/maintenance', (req, res) => {
  try {
    const schoolId = resolveSchoolId(req.body.schoolId);
    const ticket = createMaintenance({ ...req.body, schoolId }, req.user);
    res.status(201).json({ ticket });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

facilitiesRouter.patch('/maintenance/:id', requireAdmin, (req, res) => {
  try {
    const ticket = updateMaintenance(req.params.id, req.body, req.user);
    res.json({ ticket });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
