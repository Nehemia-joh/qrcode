import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { canAccessPath } from '../lib/roleAccess';

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <p className="loading">Checking session…</p>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminOnly && !user.canEdit) {
    return <Navigate to="/" replace />;
  }

  if (!canAccessPath(user.role, location.pathname)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
