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
  const [bridge, setBridge] = useState(null);

  useEffect(() => {
    Promise.all([
      apiJson(`/api/transport/qr?schoolId=${schoolId}`),
      apiJson('/api/nehemiah/status').catch(() => null),
    ]).then(([qr, status]) => {
      setData(qr);
      setBridge(status);
    });
  }, [schoolId]);

  const liveFromDb = data?.source === 'mysql';

  return (
    <>
      <p className="breadcrumb">
        <Link to="/">Overall</Link> / Transport / QR registry
      </p>
      <h2 className="page-title">Student QR registry — {currentSchool.name}</h2>
      <TransportNav />
      <section className="section-panel">
        <h2>Bus QR system (qrcode)</h2>
        <p className="section-note">
          Open Nehemiah&apos;s Bus QR app from here — you stay logged in via SSO (same username in
          both systems).
        </p>
        <QrcodeLaunchButton returnTo="finance/qrcodes.php" />
        <QrcodeLaunchButton returnTo="finance/students.php" label="Students & balances" className="btn-sm" showStatus={false} />
        <QrcodeLaunchButton returnTo="attendance/scan.php" label="Scan attendance" className="btn-sm" showStatus={false} />
        {bridge?.qrcodeLinked && (
          <p className="section-note" style={{ marginTop: '0.75rem' }}>
            Bus QR linked at <strong>{bridge.qrcodeUrl}</strong>
            {bridge.connected ? ' · live MySQL data' : ' · master sheet counts until MySQL connects'}
          </p>
        )}
      </section>
      {data?.hasData ? (
        <section className="section-panel">
          <h2>
            Students per route ({data.totalStudents} total)
            {liveFromDb && <span className="tag tag-live" style={{ marginLeft: '0.5rem' }}>Live</span>}
          </h2>
          {data.note && <p className="section-note">{data.note}</p>}
          <DataTable
            headers={['Route', 'Students with QR']}
            rows={data.routes.map((r) => [r.route, r.studentsWithQr])}
          />
        </section>
      ) : (
        <p className="section-note">
          No QR registry yet. Generate codes in <strong>Bus QR → QR codes</strong>, or import the
          master sheet <strong>QR Code</strong> tab.
        </p>
      )}
    </>
  );
}
