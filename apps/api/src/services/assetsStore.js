import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import QRCode from 'qrcode';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS_FILE = join(__dirname, '../../../../data/ops-assets.json');

const CONDITIONS = ['good', 'fair', 'poor', 'out_of_service'];

function ensure() {
  const dir = dirname(ASSETS_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (!existsSync(ASSETS_FILE)) writeFileSync(ASSETS_FILE, '[]', 'utf8');
}

function load() {
  ensure();
  return JSON.parse(readFileSync(ASSETS_FILE, 'utf8'));
}

function save(assets) {
  ensure();
  writeFileSync(ASSETS_FILE, JSON.stringify(assets, null, 2), 'utf8');
}

function nextTag(schoolId) {
  const assets = load().filter((a) => a.schoolId === schoolId);
  const num = assets.length + 1;
  return `AST-${schoolId.replace('sl-', '').toUpperCase().slice(0, 4)}-${String(num).padStart(4, '0')}`;
}

export function listAssets(schoolId) {
  let assets = load().filter((a) => a.status !== 'deleted');
  if (schoolId) assets = assets.filter((a) => a.schoolId === schoolId);
  return assets.sort((a, b) => a.name.localeCompare(b.name));
}

export function getAsset(id) {
  return load().find((a) => a.id === id && a.status !== 'deleted') ?? null;
}

export function getAssetByTag(tag) {
  return load().find((a) => a.assetTag === tag && a.status !== 'deleted') ?? null;
}

export async function createAsset(payload) {
  const assets = load();
  const asset = {
    id: randomUUID(),
    schoolId: payload.schoolId,
    assetTag: payload.assetTag || nextTag(payload.schoolId),
    name: String(payload.name || '').trim(),
    category: payload.category || 'general',
    campus: payload.campus || null,
    location: payload.location || null,
    condition: CONDITIONS.includes(payload.condition) ? payload.condition : 'good',
    assignedTo: payload.assignedTo || null,
    purchaseDate: payload.purchaseDate || null,
    notes: payload.notes || null,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (!asset.name) throw new Error('Asset name is required');
  if (assets.some((a) => a.assetTag === asset.assetTag)) throw new Error('Asset tag already exists');
  assets.push(asset);
  save(assets);
  return asset;
}

export function updateAsset(id, patch) {
  const assets = load();
  const idx = assets.findIndex((a) => a.id === id);
  if (idx < 0) throw new Error('Asset not found');
  const a = assets[idx];
  if (patch.name) a.name = String(patch.name).trim();
  if (patch.category) a.category = patch.category;
  if (patch.campus != null) a.campus = patch.campus;
  if (patch.location != null) a.location = patch.location;
  if (patch.condition && CONDITIONS.includes(patch.condition)) a.condition = patch.condition;
  if (patch.assignedTo != null) a.assignedTo = patch.assignedTo;
  if (patch.notes != null) a.notes = patch.notes;
  a.updatedAt = new Date().toISOString();
  assets[idx] = a;
  save(assets);
  return a;
}

export function deleteAsset(id) {
  const assets = load();
  const idx = assets.findIndex((a) => a.id === id);
  if (idx < 0) throw new Error('Asset not found');
  assets[idx].status = 'deleted';
  assets[idx].updatedAt = new Date().toISOString();
  save(assets);
  return assets[idx];
}

export async function getAssetQrDataUrl(asset) {
  const payload = JSON.stringify({ type: 'sl_asset', id: asset.id, tag: asset.assetTag });
  return QRCode.toDataURL(payload, { margin: 1, width: 256 });
}

export { CONDITIONS };
