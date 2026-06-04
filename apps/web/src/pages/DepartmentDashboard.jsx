import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSchool } from '../context/SchoolContext';
import { useAuth } from '../context/AuthContext';
import { apiJson } from '../api/client';
import KpiCards from '../components/KpiCards';
import FacilitiesNav from '../components/FacilitiesNav';

export default function DepartmentDashboard({ moduleId, title, description }) {
  const { schoolId } = useSchool();
  const { isAdmin } = useAuth();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setSummary(null);
    apiJson(`/api/modules/${moduleId}/summary?schoolId=${schoolId}`)
      .then(setSummary)
      .catch((e) => setError(e.message));
  }, [schoolId, moduleId]);

  if (error) return <p className="error">{error}</p>;
  if (!summary) return <p className="loading">Loading {title}…</p>;

  return (
    <>
      <p className="breadcrumb">
        <Link to="/">Overall</Link> / {title}
      </p>
      {moduleId === 'facilities' && <FacilitiesNav />}
      <h2 className="page-title" style={moduleId === 'facilities' ? { marginTop: '1rem' } : undefined}>
        {title}
        {summary.reportMonth && (
          <span className="report-period">
            {summary.reportMonth} {summary.reportYear}
          </span>
        )}
      </h2>
      <p className="section-note">{description}</p>

      {!summary.hasData && (
        <div className="banner banner-info">
          No {title.toLowerCase()} master sheet for this school yet.
          {isAdmin && (
            <>
              {' '}
              <Link to="/admin/import">Load data</Link> (select {title} module) or run{' '}
              <code>python3 scripts/seed_module_dashboards.py</code> for demo KPIs.
            </>
          )}
        </div>
      )}

      {summary.hasData && summary.source && (
        <p className="section-note">Source: {summary.source}</p>
      )}

      <KpiCards kpis={summary.kpis} />

      {!summary.hasData && <PlannedList moduleId={moduleId} />}
    </>
  );
}

function PlannedList({ moduleId }) {
  const items = {
    kitchen: [
      'Meal cost vs budget (target vs actual)',
      'Food safety & hygiene score',
      'Wastage and portion control',
    ],
    facilities: [
      'Asset register with QR tagging',
      'Condition tracking per campus',
      'Maintenance request workflow',
    ],
    farm: ['Yield vs target by crop/season', 'Input cost per unit', 'Labour efficiency'],
  }[moduleId] ?? [];

  return (
    <section className="section-panel">
      <h2>Planned capabilities</h2>
      <ul className="planned-list">
        {items.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </section>
  );
}
