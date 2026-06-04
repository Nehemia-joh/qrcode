import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSchool } from '../context/SchoolContext';
import { apiJson } from '../api/client';
import TransportNav from '../components/TransportNav';
import DataTable from '../components/DataTable';

function formatTzs(n) {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-TZ', { maximumFractionDigits: 0 }).format(n);
}

export default function TransportFleet() {
  const { schoolId, currentSchool } = useSchool();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setData(null);
    apiJson(`/api/transport/fleet?schoolId=${schoolId}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [schoolId]);

  return (
    <>
      <p className="breadcrumb">
        <Link to="/">Overall</Link> / Transport / Fleet
      </p>
      <h2 className="page-title">Fleet, repairs & services — {currentSchool.name}</h2>
      <TransportNav />

      {error && <p className="error">{error}</p>}
      {!data && !error && <p className="loading">Loading fleet data…</p>}

      {data && !data.hasData && (
        <div className="banner banner-warn">No fleet data for this school yet.</div>
      )}

      {data?.hasData && (
        <>
          <section className="section-panel">
            <h2>Repairs & maintenance costs</h2>
            <DataTable
              headers={['Bus', 'Actual', 'Budget', 'Difference']}
              rows={(data.repairs ?? []).map((r) => [
                r.bus,
                formatTzs(r.actualCost),
                formatTzs(r.budget),
                formatTzs(r.difference),
              ])}
            />
          </section>
          {(data.services?.length ?? 0) > 0 && (
            <section className="section-panel">
              <h2>Bus services & costs</h2>
              <DataTable
                headers={['Campus', 'Item', 'Category', 'Qty', 'Cost/unit', 'Total']}
                rows={data.services.map((s) => [
                  s.campus,
                  s.item,
                  s.category,
                  s.quantity,
                  formatTzs(s.costPerUnit),
                  formatTzs(s.totalCost),
                ])}
              />
            </section>
          )}
          {data.liveLocationsAvailable && (
            <p className="section-note">Live GPS locations tab is in the workbook (route optimization — phase 4).</p>
          )}
        </>
      )}
    </>
  );
}
