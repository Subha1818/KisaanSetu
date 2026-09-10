import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';

// Lazy loading routes to ensure instant initial load on 3G networks
const Landing = lazy(() => import('./pages/Landing'));
const FarmerDashboard = lazy(() => import('./pages/farmer/FarmerDashboard'));
const BookAppointment = lazy(() => import('./pages/farmer/BookAppointment'));
const CentreDashboard = lazy(() => import('./pages/centre/CentreDashboard'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminCentreDetails = lazy(() => import('./pages/admin/AdminCentreDetails'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const PendingApproval = lazy(() => import('./pages/centre/PendingApproval'));
const RejectedCentre = lazy(() => import('./pages/centre/RejectedCentre'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));

// Fast lightweight loading indicator for 3G route transitions
const PageLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-[50vh] p-4">
    <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
    <span className="text-sm font-medium text-emerald-800 animate-pulse">KisaanSetu Loading...</span>
  </div>
);

function App() {
  return (
    <Router>
      <Layout>
        <Suspense fallback={<PageLoader />}>
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
              path="/centre/pending"
              element={
                <ProtectedRoute>
                  <PendingApproval />
                </ProtectedRoute>
              }
            />
            <Route
              path="/centre/rejected"
              element={
                <ProtectedRoute>
                  <RejectedCentre />
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

            {/* Legal Pages */}
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
          </Routes>
        </Suspense>
      </Layout>
    </Router>
  );
}

export default App;
