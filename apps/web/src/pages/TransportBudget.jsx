import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSchool } from '../context/SchoolContext';
import { apiJson } from '../api/client';
import TransportNav from '../components/TransportNav';
import DataTable from '../components/DataTable';

function fmt(n) {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-TZ', { maximumFractionDigits: 0 }).format(n);
}

export default function TransportBudget() {
  const { schoolId, currentSchool } = useSchool();
  const [data, setData] = useState(null);

  useEffect(() => {
    apiJson(`/api/transport/budget?schoolId=${schoolId}`).then(setData);
  }, [schoolId]);

  return (
    <>
      <p className="breadcrumb">
        <Link to="/">Overall</Link> / Transport / Budget & P&L
      </p>
      <h2 className="page-title">Budget & P&L detail — {currentSchool.name}</h2>
      <TransportNav />
      <p className="section-note">Tabs: <strong>Transport PL</strong>, <strong>Actual vs Budget</strong></p>
      {!data && <p className="loading">Loading…</p>}
      {data?.hasData && (
        <>
          <section className="section-panel">
            <h2>P&L lines (year)</h2>
            <DataTable
              headers={['Line', 'Year budget', 'YTD actual', 'Jan', 'Feb', 'Mar']}
              rows={data.profitLoss.map((l) => [
                l.label,
                fmt(l.yearBudget),
                fmt(l.ytdActual),
                fmt(l.monthly?.Jan),
                fmt(l.monthly?.Feb),
                fmt(l.monthly?.Mar),
              ])}
            />
          </section>
          {data.repairMaintenance?.monthly?.length > 0 && (
            <section className="section-panel">
              <h2>Repair & maintenance vs budget</h2>
              <DataTable
                headers={['Month', 'Actual']}
                rows={data.repairMaintenance.monthly.map((m) => [m.month, fmt(m.actual)])}
              />
            </section>
          )}
        </>
      )}
    </>
  );
}
