import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  ReferenceLine,
} from 'recharts';
import { useSchool } from '../context/SchoolContext';
import { useAuth } from '../context/AuthContext';
import { apiJson, apiDownload } from '../api/client';
import KpiCards from '../components/KpiCards';
import DataTable from '../components/DataTable';
import NehemiahPanel from '../components/NehemiahPanel';
import TransportNav from '../components/TransportNav';
import SchoolScopeBanner from '../components/SchoolScopeBanner';

function formatTzs(n) {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-TZ', { maximumFractionDigits: 0 }).format(n);
}

export default function TransportSummary() {
  const { schoolId, currentSchool } = useSchool();
  const { isAdmin } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setData(null);
    apiJson(`/api/transport/summary?schoolId=${schoolId}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [schoolId]);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p className="loading">Loading transport summary…</p>;

  const occPct = data.occupancy?.rows?.find((r) => r.label?.includes('Overall Occupancy'));
  const occupancyChart = occPct
    ? [
        { campus: 'Usariver', pct: occPct.usariver, target: 95 },
        { campus: 'AM', pct: occPct.am, target: 95 },
        { campus: 'Kijenge', pct: occPct.kijenge, target: 95 },
        { campus: 'Ilboru', pct: occPct.ilboru, target: 95 },
        { campus: 'Boma', pct: occPct.boma, target: 95 },
      ]
    : [];

  const incidentChart = (data.incidents?.monthly ?? []).map((m) => ({
    month: m.month,
    total: m.total,
  }));

  const arrivalChart = (data.busArrival?.monthly ?? []).map((m) => ({
    month: m.month,
    total: m.total,
    target: data.busArrival?.targetPct,
  }));

  const hasData = data.hasData !== false;

  return (
    <>
      <p className="breadcrumb">
        <Link to="/">Overall</Link> / Transport / Summary
      </p>
      <TransportNav />
      <SchoolScopeBanner
        viewMode={data.viewMode}
        campusLabel={data.campusLabel}
        source={data.source}
      />
      <h2 className="page-title" style={{ marginTop: '1rem' }}>
        Transport Summary — {currentSchool.name}
        {data.reportMonth && (
          <span className="report-period">
            {data.reportMonth} {data.reportYear}
          </span>
        )}
      </h2>
      {data.source && hasData && (
        <p className="section-note">
          Source: {data.source}
          {isAdmin && (
            <>
              {' · '}
              <button
                type="button"
                className="link-button"
                onClick={() =>
                  apiDownload(
                    `/api/transport/export/pdf?schoolId=${schoolId}`,
                    `transport-${schoolId}.pdf`
                  )
                }
              >
                Download PDF
              </button>
            </>
          )}
        </p>
      )}

      <KpiCards kpis={data.kpis} />

      <NehemiahPanel />

      {hasData && (
        <>
          <Section title="1. Occupancy (95%)">
            <DataTable
              headers={['Description', 'Total', 'Usariver', 'AM', 'Kijenge', 'Ilboru', 'Boma']}
              rows={(data.occupancy?.rows ?? []).map((r) => [
                r.label,
                r.total,
                r.usariver,
                r.am,
                r.kijenge,
                r.ilboru,
                r.boma,
              ])}
            />
            {data.occupancy?.targetedStudentsAt95 != null && (
              <p className="section-note">
                Target headcount @ 95%: <strong>{data.occupancy.targetedStudentsAt95}</strong>
                {data.occupancy.gapToTarget != null && (
                  <>
                    {' '}
                    — Gap: <strong>{data.occupancy.gapToTarget}</strong> students
                  </>
                )}
              </p>
            )}
            {occupancyChart.length > 0 && (
              <ChartBox title="Occupancy % by campus">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={occupancyChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="campus" />
                    <YAxis domain={[0, 130]} />
                    <Tooltip />
                    <ReferenceLine y={95} stroke="#dc2626" strokeDasharray="4 4" label="95%" />
                    <Bar dataKey="pct" fill="#002368" name="Occupancy %" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartBox>
            )}
          </Section>

          <Section title="2. Incidents (0)">
            <DataTable
              headers={['Month', 'Total', 'Usariver', 'Arusha Modern']}
              rows={(data.incidents?.monthly ?? []).map((m) => [
                m.month,
                m.total,
                m.usariver,
                m.arushaModern,
              ])}
            />
            <p className="section-note">
              YTD total: <strong>{data.incidents?.ytdTotal ?? '—'}</strong>
            </p>
            {incidentChart.length > 0 && (
              <ChartBox title="Incidents by month">
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={incidentChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="total" stroke="#dc2626" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartBox>
            )}
          </Section>

          <Section title="3. Bus Arrival Time (90%)">
            <DataTable
              headers={['Month', 'Usariver', 'AM', 'Mbegu', 'Total']}
              rows={(data.busArrival?.monthly ?? []).map((m) => [
                m.month,
                m.usariver != null ? `${m.usariver}%` : '—',
                m.am != null ? `${m.am}%` : '—',
                m.mbegu != null ? `${m.mbegu}%` : '—',
                m.total != null ? `${m.total}%` : '—',
              ])}
            />
            {data.busArrival?.ytd?.total != null && (
              <p className="section-note">
                YTD total: <strong>{data.busArrival.ytd.total}%</strong> (target{' '}
                {data.busArrival.targetPct}%)
              </p>
            )}
            {arrivalChart.length > 0 && (
              <ChartBox title="On-time % trend">
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={arrivalChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <ReferenceLine y={90} stroke="#dc2626" strokeDasharray="4 4" />
                    <Line type="monotone" dataKey="total" stroke="#002368" name="Combined %" />
                  </LineChart>
                </ResponsiveContainer>
              </ChartBox>
            )}
          </Section>

          <Section title="4. Transport P&L">
            <DataTable
              headers={['Line', 'Total', 'Usariver', 'AM', 'Kijenge', 'Ilboru', 'Boma']}
              rows={[
                ...(data.profitLoss?.lines ?? []).map((l) => [
                  l.label,
                  formatTzs(l.total),
                  formatTzs(l.usariver),
                  formatTzs(l.am),
                  formatTzs(l.kijenge),
                  formatTzs(l.ilboru),
                  formatTzs(l.boma),
                ]),
                [
                  'Profit/(Loss)',
                  formatTzs(data.profitLoss?.netProfitLoss?.total),
                  formatTzs(data.profitLoss?.netProfitLoss?.usariver),
                  formatTzs(data.profitLoss?.netProfitLoss?.am),
                  formatTzs(data.profitLoss?.netProfitLoss?.kijenge),
                  formatTzs(data.profitLoss?.netProfitLoss?.ilboru),
                  formatTzs(data.profitLoss?.netProfitLoss?.boma),
                ],
              ]}
            />
          </Section>
        </>
      )}
    </>
  );
}

function Section({ title, children }) {
  return (
    <div className="section-panel">
      <h2>{title}</h2>
      {children}
    </div>
  );
}

function ChartBox({ title, children }) {
  return (
    <div className="chart-box">
      <h3>{title}</h3>
      {children}
    </div>
  );
}
