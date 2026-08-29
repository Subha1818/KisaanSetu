import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import Landing from './pages/Landing';
import FarmerDashboard from './pages/farmer/FarmerDashboard';
import BookAppointment from './pages/farmer/BookAppointment';
import CentreDashboard from './pages/centre/CentreDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminCentreDetails from './pages/admin/AdminCentreDetails';
import Login from './pages/Login';
import Register from './pages/Register';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          {/* Public Landing Page */}
          <Route path="/" element={<Landing />} />

          {/* Main Dashboard Panels wrapped in ProtectedRoute */}
          <Route
            path="/farmer"
            element={
              <ProtectedRoute allowedRoles={['farmer']}>
                <FarmerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/farmer/book"
            element={
              <ProtectedRoute allowedRoles={['farmer']}>
                <BookAppointment />
              </ProtectedRoute>
            }
          />
          <Route
            path="/centre"
            element={
              <ProtectedRoute allowedRoles={['staff']}>
                <CentreDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/centre/:id"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminCentreDetails />
              </ProtectedRoute>
            }
          />

          {/* Auth Pages */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
