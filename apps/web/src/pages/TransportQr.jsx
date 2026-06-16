import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSchool } from '../context/SchoolContext';
import { apiJson } from '../api/client';
import TransportNav from '../components/TransportNav';
import QrcodeLaunchButton from '../components/QrcodeLaunchButton';
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
      <section className="section-panel">
        <h2>Bus QR system (qrcode.zip)</h2>
        <p className="section-note">
          While logged into Transport here, open the Nehemiah PHP app without signing in again (same
          username in both systems).
        </p>
        <QrcodeLaunchButton returnTo="finance/qrcodes.php" />
        <QrcodeLaunchButton returnTo="finance/students.php" label="Students & balances" className="btn-sm" showStatus={false} />
      </section>
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
