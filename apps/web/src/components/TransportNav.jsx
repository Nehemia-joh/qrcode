import { NavLink } from 'react-router-dom';
import QrcodeLaunchButton from './QrcodeLaunchButton';

const tabs = [
  { to: '/transport', end: true, label: 'Summary' },
  { to: '/transport/buses', label: 'Buses' },
  { to: '/transport/incidents', label: 'Incidents' },
  { to: '/transport/fleet', label: 'Fleet' },
  { to: '/transport/budget', label: 'Budget' },
  { to: '/transport/gps', label: 'GPS' },
  { to: '/transport/qr', label: 'QR' },
];

export default function TransportNav() {
  return (
    <>
      <nav className="sub-nav">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) => (isActive ? 'sub-nav-link active' : 'sub-nav-link')}
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <div className="transport-qrcode-bar">
        <QrcodeLaunchButton returnTo="index.php" label="Open Bus QR (qrcode)" showStatus={false} />
        <QrcodeLaunchButton
          returnTo="finance/qrcodes.php"
          label="QR codes"
          className="btn-sm"
          showStatus={false}
        />
        <QrcodeLaunchButton
          returnTo="attendance/scan.php"
          label="Scan attendance"
          className="btn-sm"
          showStatus={false}
        />
      </div>
    </>
  );
}
