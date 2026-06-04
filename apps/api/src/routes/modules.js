import { Router } from 'express';
import { resolveSchoolId } from '../data/schools.js';
import { existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getModuleSummary, MODULES, moduleHasData } from '../services/moduleParser.js';
import { getLastImportByModule } from '../services/importLogStore.js';

const DATA_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../../../data');

export const modulesRouter = Router();

modulesRouter.get('/import-status', (req, res) => {
  const schoolId = resolveSchoolId(req.query.schoolId);
  const modules = Object.keys(MODULES).map((moduleId) => {
    const dir = join(DATA_ROOT, 'schools', schoolId, moduleId);
    const hasDashboard = moduleHasData(schoolId, moduleId);
    let tabCount = 0;
    if (existsSync(dir)) {
      tabCount = readdirSync(dir).filter((f) => f.endsWith('.json')).length;
    }
    const last = getLastImportByModule(schoolId, moduleId);
    return {
      moduleId,
      hasData: hasDashboard,
      tabCount,
      lastImportAt: last?.at || null,
      lastImportFile: last?.filename || null,
    };
  });
  res.json({ schoolId, modules });
});

modulesRouter.get('/:moduleId/summary', (req, res) => {
  const moduleId = req.params.moduleId;
  if (!MODULES[moduleId]) {
    return res.status(404).json({ error: 'Unknown module' });
  }
  const schoolId = resolveSchoolId(req.query.schoolId);
  res.json(getModuleSummary(schoolId, moduleId));
});
