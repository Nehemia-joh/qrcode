import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSchool } from '../context/SchoolContext';
import { useAuth } from '../context/AuthContext';
import { apiJson } from '../api/client';

export default function DataSourcesPage() {
  const { schoolId, currentSchool } = useSchool();
  const { isAdmin } = useAuth();
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    apiJson(`/api/system/overview?schoolId=${schoolId}`).then(setOverview);
  }, [schoolId]);

  if (!overview) return <p className="loading">Loading system map…</p>;

  const gs = overview.googleSheet;
  const wb = overview.dataSources.masterWorkbook;

  return (
    <>
      <p className="breadcrumb">
        <Link to="/">Overall</Link> / Data sources
      </p>
      <h2 className="page-title">How everything connects — {currentSchool.name}</h2>
      <p className="section-note">
        Transport uses <strong>one master workbook</strong> with a column per campus. Choose{' '}
        <strong>Silverleaf — All Campuses</strong> for the full group, or a campus school (Usariver,
        Arusha Modern, …) for that site only. See <code>docs/DATA_MODEL_SCHOOLS.md</code>.
      </p>

      <section className="section-panel">
        <h2>Google Sheet (source of truth for KPIs)</h2>
        <p className="section-note">{gs.importInstructions}</p>
        <p>
          <a href={gs.editUrl} target="_blank" rel="noreferrer">
            Open Transport Master Sheet in Google Sheets
          </a>
        </p>
        {isAdmin && (
          <p>
            <Link to="/admin/import">Import downloaded .xlsx</Link> after each monthly update.
          </p>
        )}
        {wb.status === 'connected' ? (
          <p>
            <strong>
              {wb.wiredCount}/{wb.totalTabs}
            </strong>{' '}
            tabs wired to dashboards.
            {wb.lastImportAt && (
              <>
                {' '}
                Last import: {new Date(wb.lastImportAt).toLocaleString()}
                {wb.stale && ' — consider re-importing (data is stale).'}
              </>
            )}
          </p>
        ) : (
          <div className="banner banner-warn">No workbook imported for this school yet.</div>
        )}
      </section>

      <section className="section-panel">
        <h2>Sheet tab → Dashboard map</h2>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Google tab</th>
                <th>Dashboard</th>
                <th>Status</th>
                <th>Rows</th>
              </tr>
            </thead>
            <tbody>
              {(wb.tabs || []).map((t) => (
                <tr key={t.slug}>
                  <td>{t.sheetTab}</td>
                  <td>
                    {t.uiRoute ? (
                      <Link to={t.uiRoute}>{t.uiRoute}</Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{t.wired ? '✓ Live' : t.imported ? 'Imported' : 'Missing'}</td>
                  <td>{t.rowCount || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section-panel">
        <h2>Can I load data into the system?</h2>
        <p className="section-note">Yes. Admins upload Excel; staff use forms; scans use webhooks.</p>
        <ul className="planned-list">
          <li>
            <strong>Google Sheets / Excel</strong> — Admin →{' '}
            {isAdmin ? <Link to="/admin/import">Load data</Link> : 'Load data (admin only)'} — upload
            .xlsx for Transport, Kitchen, Farm, or Facilities
          </li>
          <li>
            <strong>Staff reports</strong> — <Link to="/reports">Reports</Link> → new report (email
            notifies ops)
          </li>
          <li>
            <strong>Facilities</strong> — assets and maintenance tickets in Facilities module
          </li>
          <li>
            <strong>QR attendance</strong> — live webhook from Nehemiah PHP, or rows from Attendance
            tabs when you import transport
          </li>
          <li>
            <strong>Database (Nehemiah MySQL)</strong> — deferred; link after UI is signed off
          </li>
        </ul>
      </section>

      <section className="section-panel">
        <h2>Notifications (email + SMS)</h2>
        <ul className="planned-list">
          <li>
            <strong>Staff reports</strong> → email to {overview.notifications.email.opsNotifyEmail} (
            {overview.notifications.email.provider})
          </li>
          <li>
            <strong>Parent fee alerts</strong> → SMS ({overview.notifications.sms.provider}) + email when
            configured
          </li>
          <li>
            <strong>Nehemiah PHP</strong> → webhook attendance (no database on Operations yet)
          </li>
          <li>
            <strong>Database</strong> → deferred until UI complete
          </li>
        </ul>
      </section>

      <section className="section-panel">
        <h2>Backend stack</h2>
        <ul className="planned-list">
          <li>{overview.backend.web}</li>
          <li>{overview.backend.api}</li>
          <li>{overview.backend.legacy}</li>
          <li>{overview.backend.storage}</li>
        </ul>
      </section>
    </>
  );
}
