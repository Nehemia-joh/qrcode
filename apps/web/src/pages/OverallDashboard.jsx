import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSchool } from '../context/SchoolContext';
import { apiJson, apiDownload } from '../api/client';
import { useAuth } from '../context/AuthContext';
import KpiCards from '../components/KpiCards';

export default function OverallDashboard() {
  const { schoolId, currentSchool } = useSchool();
  const { isAdmin } = useAuth();
  const [data, setData] = useState(null);
  const [network, setNetwork] = useState(null);
  const [error, setError] = useState(null);

  const [openReports, setOpenReports] = useState(0);
  const [sheetMap, setSheetMap] = useState(null);
  const [executive, setExecutive] = useState(null);

  useEffect(() => {
    setData(null);
    Promise.all([
      apiJson(`/api/operations/summary?schoolId=${schoolId}`),
      apiJson('/api/operations/network'),
      apiJson(`/api/reports/summary?schoolId=${schoolId}`).catch(() => ({ openCount: 0 })),
      apiJson(`/api/system/sheet-map?schoolId=${schoolId}`).catch(() => null),
      apiJson(`/api/operations/executive?schoolId=${schoolId}`).catch(() => null),
    ])
      .then(([summary, net, rep, sm, exec]) => {
        setData(summary);
        setNetwork(net);
        setOpenReports(rep.openCount ?? 0);
        setSheetMap(sm);
        setExecutive(exec);
      })
      .catch((e) => setError(e.message));
  }, [schoolId]);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p className="loading">Loading operations overview…</p>;

  const transport = data.modules.find((m) => m.id === 'transport');

  return (
    <>
      <p className="breadcrumb">Home / Overall Dashboard</p>
      <h2 className="page-title">
        Operations Summary — {currentSchool.name}
        {data.reportMonth && (
          <span className="report-period">
            {data.reportMonth} {data.reportYear}
          </span>
        )}
      </h2>
      {isAdmin && (
        <p className="section-note">
          <button
            type="button"
            className="link-button"
            onClick={() =>
              apiDownload(
                `/api/operations/export/pdf?schoolId=${schoolId}`,
                `operations-${schoolId}.pdf`
              )
            }
          >
            Download operations PDF
          </button>
        </p>
      )}

      <div className="overview-stats">
        <div className="stat-chip">
          <span className="stat-label">Schools in network</span>
          <span className="stat-value">{data.overview.schoolsInNetwork}</span>
        </div>
        <div className="stat-chip on-track">
          <span className="stat-label">KPIs on track</span>
          <span className="stat-value">{data.overview.kpisOnTrack}</span>
        </div>
        <div className="stat-chip off-track">
          <span className="stat-label">KPIs off track</span>
          <span className="stat-value">{data.overview.kpisOffTrack}</span>
        </div>
        <div className="stat-chip">
          <span className="stat-label">Awaiting data</span>
          <span className="stat-value">{data.overview.kpisPending}</span>
        </div>
        <Link to="/reports" className="stat-chip off-track" style={{ textDecoration: 'none', color: 'inherit' }}>
          <span className="stat-label">Open staff reports</span>
          <span className="stat-value">{openReports}</span>
        </Link>
      </div>

      {schoolId === 'sl-main' && data.transportSummary?.campuses?.length > 0 && (
        <section className="section-panel">
          <h2>Transport by campus (master sheet)</h2>
          <p className="section-note">
            One workbook, multiple campuses. Select a campus in the header to drill into Usariver,
            Arusha Modern, Kijenge, and others.
          </p>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Campus</th>
                  <th>Occupancy</th>
                  <th>Incidents (YTD)</th>
                  <th>Bus arrival</th>
                </tr>
              </thead>
              <tbody>
                {data.transportSummary.campuses.map((c) => {
                  const k = Object.fromEntries((c.kpis || []).map((x) => [x.key, x]));
                  return (
                    <tr key={c.campusKey}>
                      <td>{c.label}</td>
                      <td>{fmt(k.occupancy)}</td>
                      <td>{k.incidents?.actual ?? '—'}</td>
                      <td>{fmt(k.bus_arrival)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {executive?.offTrackAlerts?.length > 0 && (
        <section className="section-panel">
          <h2>Executive alerts (off track)</h2>
          <ul className="planned-list">
            {executive.offTrackAlerts.map((a) => (
              <li key={`${a.module}-${a.kpi}`}>
                <strong>{a.module}</strong> — {a.kpi}: {a.actual} (target {a.target})
              </li>
            ))}
          </ul>
        </section>
      )}

      {transport?.hasData && (
        <>
          <h3 className="section-heading">
            {data.transportSummary?.viewMode === 'campus'
              ? `Transport KPIs — ${data.transportSummary.campusLabel}`
              : 'Transport KPIs (live from master sheet)'}
          </h3>
          <KpiCards kpis={transport.kpis} />
        </>
      )}

      {sheetMap?.hasWorkbook && (
        <section className="section-panel">
          <h2>Google Sheet connection</h2>
          <p className="section-note">
            <strong>{sheetMap.wiredCount}/{sheetMap.totalTabs}</strong> tabs from your master
            workbook are live. <Link to="/data-sources">View full data map</Link>
          </p>
        </section>
      )}

      <h3 className="section-heading">Modules</h3>
      <div className="card-grid">
        {data.modules.map((m) => (
          <Link
            key={m.id}
            to={m.path}
            className={`module-card ${m.hasData ? 'active' : m.active ? 'partial' : 'disabled'}`}
          >
            <strong>{m.name}</strong>
            <div className="module-meta">
              {m.hasData ? (
                <span className="tag tag-live">Live data</span>
              ) : m.active ? (
                <span className="tag tag-stub">Structure ready</span>
              ) : (
                <span className="tag tag-soon">Coming soon</span>
              )}
            </div>
            {m.kpis?.length > 0 && (
              <ul className="mini-kpi-list">
                {m.kpis.slice(0, 3).map((k) => (
                  <li key={k.key}>
                    {k.label}: {k.actual != null ? k.actual : '—'}
                    {k.unit === '%' ? '%' : ''}
                  </li>
                ))}
              </ul>
            )}
          </Link>
        ))}
      </div>

      <section className="section-panel">
        <h2>All Silverleaf locations</h2>
        <p className="section-note">
          Campuses in the transport master sheet show live KPIs per column. Other regions need their
          own workbook via <Link to="/admin/import">Load data</Link>.
        </p>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>School</th>
                <th>Region</th>
                <th>Data</th>
                <th>Occupancy</th>
                <th>Incidents</th>
                <th>Bus arrival</th>
                <th>P&L</th>
              </tr>
            </thead>
            <tbody>
              {network?.schools?.map((s) => {
                const k = Object.fromEntries((s.kpis || []).map((x) => [x.key, x]));
                return (
                  <tr key={s.schoolId}>
                    <td>{s.name}</td>
                    <td>{s.region}</td>
                    <td>
                      {s.hasTransportData
                        ? s.dataSource === 'master_sheet_campus'
                          ? 'Master sheet'
                          : 'Yes'
                        : 'Pending'}
                    </td>
                    <td>{fmt(k.occupancy)}</td>
                    <td>{fmt(k.incidents, false)}</td>
                    <td>{fmt(k.bus_arrival)}</td>
                    <td>{fmt(k.transport_pl)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function fmt(kpi, isPct = true) {
  if (!kpi || kpi.actual == null) return '—';
  if (!isPct && kpi.unit === 'count') return kpi.actual;
  return `${kpi.actual}%`;
}
