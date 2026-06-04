import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiJson } from '../api/client';

const ROLE_OPTIONS = [
  { value: 'viewer', label: 'Viewer (read-only)' },
  { value: 'transport_manager', label: 'Transport Manager' },
  { value: 'kitchen_manager', label: 'Kitchen Manager' },
  { value: 'facilities_manager', label: 'Facilities Manager' },
  { value: 'farm_manager', label: 'Farm Manager' },
  { value: 'admin', label: 'Administrator' },
];

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [form, setForm] = useState({
    username: '',
    password: '',
    fullName: '',
    email: '',
    role: 'viewer',
  });

  const load = () => {
    apiJson('/api/admin/users')
      .then((d) => setUsers(d.users))
      .catch((e) => setError(e.message));
  };

  useEffect(load, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      await apiJson('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setMessage(`User "${form.username}" created.`);
      setForm({ username: '', password: '', fullName: '', email: '', role: 'viewer' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <p className="breadcrumb">
        <Link to="/">Overall</Link> / Admin / Users
      </p>
      <h2 className="page-title">Manage users</h2>
      <p className="section-note">Only administrators can create accounts. No public sign-up.</p>

      {error && <div className="banner banner-warn">{error}</div>}
      {message && <div className="banner banner-info">{message}</div>}

      <section className="section-panel">
        <h2>Create user</h2>
        <form className="admin-form" onSubmit={handleCreate}>
          <label>
            Username
            <input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
            />
          </label>
          <label>
            Password (min 8 chars)
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={8}
            />
          </label>
          <label>
            Full name
            <input
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label>
            Role
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn-primary">
            Create user
          </button>
        </form>
      </section>

      <section className="section-panel">
        <h2>Active users ({users.length})</h2>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Name</th>
                <th>Role</th>
                <th>Schools</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.username}</td>
                  <td>{u.fullName}</td>
                  <td>{u.roleLabel}</td>
                  <td>{u.schoolIds?.includes('*') ? 'All schools' : u.schoolIds?.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
