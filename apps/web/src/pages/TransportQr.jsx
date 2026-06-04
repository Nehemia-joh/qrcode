import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSchool } from '../context/SchoolContext';
import { apiJson } from '../api/client';
import TransportNav from '../components/TransportNav';
import DataTable from '../components/DataTable';

export default function TransportQr() {
  const { schoolId, currentSchool } = useSchool();
  const [data, setData] = useState(null);

  useEffect(() => {
    apiJson(`/api/transport/qr?schoolId=${schoolId}`).then(setData);
  }, [schoolId]);

  return (
    <>
      <p className="breadcrumb">
        <Link to="/">Overall</Link> / Transport / QR registry
      </p>
      <h2 className="page-title">Student QR registry — {currentSchool.name}</h2>
      <TransportNav />
      <p className="section-note">
        From tab <strong>QR Code</strong>. Live generation stays in Nehemiah until database is linked.
      </p>
      {data?.hasData && (
        <section className="section-panel">
          <h2>Students per route ({data.totalStudents} total)</h2>
          <DataTable
            headers={['Route', 'Students']}
            rows={data.routes.map((r) => [r.route, r.studentsWithQr])}
          />
        </section>
      )}
    </>
  );
}
