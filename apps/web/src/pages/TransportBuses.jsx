import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSchool } from '../context/SchoolContext';
import { apiJson } from '../api/client';
import TransportNav from '../components/TransportNav';
import DataTable from '../components/DataTable';

export default function TransportBuses() {
  const { schoolId, currentSchool } = useSchool();
  const [data, setData] = useState(null);

  useEffect(() => {
    apiJson(`/api/transport/buses?schoolId=${schoolId}`).then(setData).catch(() => setData({ hasData: false }));
  }, [schoolId]);

  return (
    <>
      <p className="breadcrumb">
        <Link to="/">Overall</Link> / Transport / Bus roster
      </p>
      <h2 className="page-title">Bus roster — {currentSchool.name}</h2>
      <TransportNav />
      <p className="section-note">From Google Sheet tab: <strong>Transport Users.</strong></p>
      {!data && <p className="loading">Loading…</p>}
      {data && !data.hasData && <div className="banner banner-warn">Import transport workbook first.</div>}
      {data?.hasData && (
        <section className="section-panel">
          <h2>Vehicles ({data.total})</h2>
          <DataTable
            headers={['Campus', 'Bus', 'Type', 'Occupancy', 'Capacity', 'Spare', 'Route']}
            rows={data.buses.map((b) => [
              b.campus,
              b.busNo,
              b.busType,
              b.occupancy,
              b.maxCapacity,
              b.spareSeats,
              b.route,
            ])}
          />
        </section>
      )}
    </>
  );
}
