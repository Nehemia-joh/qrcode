import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useSchool } from '../context/SchoolContext';
import { useAuth } from '../context/AuthContext';
import { filterNavForRole } from '../lib/roleAccess';
import { apiJson } from '../api/client';

const navItems = [
  { to: '/', label: 'Overall' },
  { to: '/transport', label: 'Transport' },
  { to: '/kitchen', label: 'Kitchen' },
  { to: '/facilities', label: 'Facilities' },
  { to: '/farm', label: 'Farm' },
  { to: '/reports', label: 'Reports' },
  { to: '/data-sources', label: 'Data map' },
];

export default function AppLayout() {
  const { schools, schoolId, selectSchool, currentSchool, loading, schoolGroups } = useSchool();
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const nav = filterNavForRole(user?.role || 'viewer', navItems);
  const [importHint, setImportHint] = useState(null);

  useEffect(() => {
    if (!isAdmin) {
      setImportHint(null);
      return;
    }
    apiJson(`/api/admin/import/status?schoolId=${schoolId}`)
      .then((s) => {
        if (!s.sheetMap?.hasWorkbook) setImportHint({ type: 'missing' });
        else if (s.stale?.transport) setImportHint({ type: 'stale', days: s.stale.staleAfterDays });
        else setImportHint(null);
      })
      .catch(() => setImportHint(null));
  }, [isAdmin, schoolId]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-brand">
          <span className="brand-icon" aria-hidden>
            ◆
          </span>
          <div>
            <h1>Silverleaf Operations</h1>
            <span className="header-sub">
              {user?.fullName} · {user?.roleLabel}
            </span>
          </div>
        </div>
        <div className="header-actions">
          <label className="school-select-label">
            School
            <select
              value={schoolId}
              onChange={(e) => selectSchool(e.target.value)}
              disabled={loading}
              className="school-select"
            >
              {schoolGroups.length > 0
                ? schoolGroups.map((g) => (
                    <optgroup key={g.id} label={g.label}>
                      {g.schools.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                          {!s.hasTransportData ? ' (no data)' : ''}
                        </option>
                      ))}
                    </optgroup>
                  ))
                : schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {!s.hasTransportData ? ' (no data)' : ''}
                    </option>
                  ))}
            </select>
          </label>
          {isAdmin && (
            <div className="admin-links">
              <Link to="/admin/import">Load data</Link>
              <Link to="/admin/users">Users</Link>
            </div>
          )}
          <Link to="/settings" className="settings-link">
            Settings
          </Link>
          <button type="button" className="btn-logout" onClick={logout}>
            Log out
          </button>
        </div>
      </header>
      <nav className="app-nav">
        {nav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={location.pathname === item.to ? 'nav-link active' : 'nav-link'}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <main className="app-main">
        {isAdmin && importHint?.type === 'stale' && (
          <div className="banner banner-warn">
            Transport sheet data is older than {importHint.days} days for{' '}
            <strong>{currentSchool.name}</strong>.{' '}
            <Link to="/admin/import">Re-import the latest .xlsx</Link>.
          </div>
        )}
        {isAdmin && importHint?.type === 'missing' && location.pathname !== '/admin/import' && (
          <div className="banner banner-warn">
            No master workbook loaded for <strong>{currentSchool.name}</strong>.{' '}
            <Link to="/admin/import">Load data (upload .xlsx)</Link>.
          </div>
        )}
        {!currentSchool.hasTransportData && location.pathname === '/transport' && (
          <div className="banner banner-warn">
            No transport master sheet for <strong>{currentSchool.name}</strong> yet.
            {isAdmin && (
              <>
                {' '}
                <Link to="/admin/import">Load data</Link>.
              </>
            )}
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
