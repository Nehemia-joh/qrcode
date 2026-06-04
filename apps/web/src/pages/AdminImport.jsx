import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch, apiJson } from '../api/client';
import { useSchool } from '../context/SchoolContext';

const IMPORT_TYPES = [
  { id: 'transport', label: 'Transport', endpoint: '/api/admin/import/transport-sheet', bodyExtra: {} },
  { id: 'kitchen', label: 'Kitchen', endpoint: '/api/admin/import/module-sheet', bodyExtra: { moduleId: 'kitchen' } },
  { id: 'farm', label: 'Farm', endpoint: '/api/admin/import/module-sheet', bodyExtra: { moduleId: 'farm' } },
  { id: 'facilities', label: 'Facilities', endpoint: '/api/admin/import/module-sheet', bodyExtra: { moduleId: 'facilities' } },
];

export default function AdminImport() {
  const { schoolId } = useSchool();
  const [importType, setImportType] = useState('transport');
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [importStatus, setImportStatus] = useState(null);

  const selected = IMPORT_TYPES.find((t) => t.id === importType);

  useEffect(() => {
    apiJson(`/api/admin/import/status?schoolId=${schoolId}`).then(setImportStatus);
  }, [schoolId, status]);

  async function handleUpload(e) {
    e.preventDefault();
    if (!file || !selected) return;
    setUploading(true);
    setError(null);
    setStatus(null);

    const body = new FormData();
    body.append('file', file);
    body.append('schoolId', schoolId);
    Object.entries(selected.bodyExtra).forEach(([k, v]) => body.append(k, v));

    try {
      const res = await apiFetch(selected.endpoint, { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.detail || 'Upload failed');
      setStatus(
        data.sheetMap
          ? `${data.message} (${data.sheetMap.wiredCount}/${data.sheetMap.totalTabs} tabs → dashboards)`
          : data.message
      );
      setFile(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  const sm = importStatus?.sheetMap;
  const gs = importStatus?.googleSheet;

  return (
    <>
      <p className="breadcrumb">
        <Link to="/">Overall</Link> / Admin / Load data
      </p>
      <h2 className="page-title">Load data into the system</h2>
      <p className="section-note">
        Yes — you can load data here. The main path is uploading your <strong>Google Sheets .xlsx</strong>{' '}
        export; dashboards update immediately. No database connection is required for this step.
      </p>

      {importStatus?.stale?.transport && sm?.hasWorkbook && (
        <div className="banner banner-warn">
          Transport data may be out of date (last import over {importStatus.stale.staleAfterDays}{' '}
          days ago). Download the latest workbook from Google Sheets and re-import below.
        </div>
      )}

      {error && <div className="banner banner-warn">{error}</div>}
      {status && <div className="banner banner-info">{status}</div>}

      <section className="section-panel">
        <h2>Current status — {schoolId}</h2>
        {sm?.hasWorkbook ? (
          <ul className="planned-list">
            <li>
              <strong>{sm.wiredCount}/{sm.totalTabs}</strong> transport tabs live in dashboards
            </li>
            <li>
              Last transport import:{' '}
              {sm.lastImportAt
                ? new Date(sm.lastImportAt).toLocaleString()
                : 'unknown (files on disk)'}
            </li>
            {gs?.editUrl && (
              <li>
                <a href={gs.editUrl} target="_blank" rel="noreferrer">
                  Open Google Sheet
                </a>{' '}
                → File → Download → Microsoft Excel (.xlsx)
              </li>
            )}
          </ul>
        ) : (
          <p className="section-note">
            No workbook yet for this school. Upload the Transport Master .xlsx below.
          </p>
        )}
      </section>

      <section className="section-panel">
        <h2>Step 1 — Upload Excel workbook</h2>
        <form className="admin-form" onSubmit={handleUpload}>
          <label>
            Module
            <select value={importType} onChange={(e) => setImportType(e.target.value)}>
              {IMPORT_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            School
            <input type="text" value={schoolId} readOnly />
          </label>
          <label>
            Excel file (.xlsx)
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
            />
          </label>
          <button type="submit" className="btn-primary" disabled={uploading || !file}>
            {uploading ? 'Importing…' : `Upload ${selected?.label} sheet`}
          </button>
        </form>
        <p className="section-note">
          Kitchen, Farm, and Facilities workbooks need a <strong>Dashboard</strong> tab with KPI
          Target/Actual columns (same pattern as transport).
        </p>
      </section>

      <section className="section-panel">
        <h2>Other ways to load data</h2>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>What</th>
                <th>How</th>
              </tr>
            </thead>
            <tbody>
              {(importStatus?.loadMethods || []).map((m) => (
                <tr key={m.id}>
                  <td>{m.label}</td>
                  <td>
                    {m.route ? (
                      <>
                        {m.how} — <Link to={m.route}>Open</Link>
                      </>
                    ) : (
                      m.how
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {importStatus?.history?.length > 0 && (
        <section className="section-panel">
          <h2>Recent imports (this school)</h2>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Module</th>
                  <th>File</th>
                  <th>Tabs</th>
                </tr>
              </thead>
              <tbody>
                {importStatus.history.map((h) => (
                  <tr key={h.id}>
                    <td>{new Date(h.at).toLocaleString()}</td>
                    <td>{h.module}</td>
                    <td>{h.filename}</td>
                    <td>
                      {h.wiredCount != null && h.totalTabs
                        ? `${h.wiredCount}/${h.totalTabs}`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="section-note">
        <Link to="/data-sources">Data map</Link> shows which Google tabs feed which dashboards.
        Blank Kitchen/Farm/Facilities templates: run <code>npm run templates:modules</code> in the project
        root, then upload from <code>data/templates/</code>.
      </p>
    </>
  );
}
