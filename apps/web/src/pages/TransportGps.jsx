import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useSchool } from '../context/SchoolContext';
import { apiJson } from '../api/client';
import TransportNav from '../components/TransportNav';
import DataTable from '../components/DataTable';
import CampusMap from '../components/CampusMap';

export default function TransportGps() {
  const { schoolId, currentSchool } = useSchool();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setData(null);
    apiJson(`/api/transport/gps?schoolId=${schoolId}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [schoolId]);

  const chartData = (data?.daily ?? []).map((d) => ({
    date: d.date.slice(5),
    pct: d.compliancePct,
  }));

  return (
    <>
      <p className="breadcrumb">
        <Link to="/">Overall</Link> / Transport / GPS & routes
      </p>
      <h2 className="page-title">GPS & live route tracking — {currentSchool.name}</h2>
      <TransportNav />

      {error && <p className="error">{error}</p>}
      {!data && !error && <p className="loading">Loading GPS data…</p>}

      {data && !data.hasData && (
        <div className="banner banner-warn">No Live Locations data for this school yet.</div>
      )}

      {data?.hasData && (
        <>
          <div className="overview-stats">
            <div className="stat-chip on-track">
              <span className="stat-label">14-day avg compliance</span>
              <span className="stat-value">{data.summary?.avgCompliance14d ?? '—'}%</span>
            </div>
            <div className="stat-chip">
              <span className="stat-label">Routes tracked</span>
              <span className="stat-value">{data.summary?.routeCount}</span>
            </div>
            <div className="stat-chip">
              <span className="stat-label">Days logged</span>
              <span className="stat-value">{data.summary?.totalDays}</span>
            </div>
          </div>

          <p className="section-note">
            From <strong>Live Locations</strong> tab — Yes/No per route per day. Map shows school network campuses.
          </p>

          <section className="section-panel">
            <h2>School network map</h2>
            <CampusMap schoolId={schoolId} />
          </section>

          {chartData.length > 0 && (
            <section className="section-panel">
              <h2>Daily route reporting compliance</h2>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <ReferenceLine y={90} stroke="#dc2626" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="pct" stroke="#002368" name="Compliance %" />
                </LineChart>
              </ResponsiveContainer>
            </section>
          )}

          <section className="section-panel">
            <h2>Compliance by route</h2>
            <DataTable
              headers={['Route', 'Compliance %', 'Days Yes', 'Days No']}
              rows={(data.routeStats ?? []).map((r) => [
                r.route,
                r.compliancePct != null ? `${r.compliancePct}%` : '—',
                r.daysYes,
                r.daysNo,
              ])}
            />
          </section>
        </>
      )}
    </>
  );
}
