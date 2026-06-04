import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SchoolProvider } from './context/SchoolContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';
import OverallDashboard from './pages/OverallDashboard';
import TransportSummary from './pages/TransportSummary';
import TransportIncidents from './pages/TransportIncidents';
import TransportFleet from './pages/TransportFleet';
import TransportGps from './pages/TransportGps';
import TransportBuses from './pages/TransportBuses';
import TransportBudget from './pages/TransportBudget';
import TransportQr from './pages/TransportQr';
import DataSourcesPage from './pages/DataSourcesPage';
import ReportsPage from './pages/ReportsPage';
import DepartmentDashboard from './pages/DepartmentDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminImport from './pages/AdminImport';
import FacilitiesAssets from './pages/FacilitiesAssets';
import FacilitiesMaintenance from './pages/FacilitiesMaintenance';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <SchoolProvider>
                <AppLayout />
              </SchoolProvider>
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<OverallDashboard />} />
          <Route path="/transport" element={<TransportSummary />} />
          <Route path="/transport/incidents" element={<TransportIncidents />} />
          <Route path="/transport/fleet" element={<TransportFleet />} />
          <Route path="/transport/gps" element={<TransportGps />} />
          <Route path="/transport/buses" element={<TransportBuses />} />
          <Route path="/transport/budget" element={<TransportBudget />} />
          <Route path="/transport/qr" element={<TransportQr />} />
          <Route path="/data-sources" element={<DataSourcesPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route
            path="/kitchen"
            element={
              <DepartmentDashboard
                moduleId="kitchen"
                title="Kitchen"
                description="Meal operations, cost control, and safety KPIs per school."
              />
            }
          />
          <Route
            path="/facilities"
            element={
              <DepartmentDashboard
                moduleId="facilities"
                title="Facilities"
                description="Asset register, maintenance, and campus infrastructure KPIs."
              />
            }
          />
          <Route path="/facilities/assets" element={<FacilitiesAssets />} />
          <Route path="/facilities/maintenance" element={<FacilitiesMaintenance />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route
            path="/farm"
            element={
              <DepartmentDashboard
                moduleId="farm"
                title="Farm"
                description="Production, yield, and cost KPIs for school farm operations."
              />
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute adminOnly>
                <AdminUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/import"
            element={
              <ProtectedRoute adminOnly>
                <AdminImport />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
