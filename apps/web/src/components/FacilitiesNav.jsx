import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/facilities', end: true, label: 'KPIs' },
  { to: '/facilities/assets', label: 'Assets' },
  { to: '/facilities/maintenance', label: 'Maintenance' },
];

export default function FacilitiesNav() {
  return (
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
  );
}
