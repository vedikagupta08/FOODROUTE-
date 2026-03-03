import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import DonorDashboard from './pages/DonorDashboard';
import ReceiverDashboard from './pages/ReceiverDashboard';
import VolunteerDashboard from './pages/VolunteerDashboard';
import ImpactDashboard from './pages/ImpactDashboard';

/**
 * Dashboard Redirect Component
 * Redirects users to their role-specific dashboard
 */
const DashboardRedirect = () => {
  const { userProfile } = useAuth();
  
  if (!userProfile) {
    return <Navigate to="/login" replace />;
  }

  switch (userProfile.role) {
    case 'donor':
      return <Navigate to="/dashboard/donor" replace />;
    case 'receiver':
      return <Navigate to="/dashboard/receiver" replace />;
    case 'volunteer':
      return <Navigate to="/dashboard/volunteer" replace />;
    case 'admin':
      return <Navigate to="/dashboard/admin" replace />;
    default:
      return <Navigate to="/dashboard/donor" replace />;
  }
};

/**
 * Main App Component
 * Sets up routing and authentication context
 */
function App() {
  return (
    <div className="App">
      <AuthProvider>
        <Router>
          <Toaster position="top-right" />
          <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <Navigate to="/dashboard" replace />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <DashboardRedirect />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/donor"
            element={
              <ProtectedRoute allowedRoles={['donor', 'admin']}>
                <Layout>
                  <DonorDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/receiver"
            element={
              <ProtectedRoute allowedRoles={['receiver', 'admin']}>
                <Layout>
                  <ReceiverDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/volunteer"
            element={
              <ProtectedRoute allowedRoles={['volunteer', 'admin']}>
                <Layout>
                  <VolunteerDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Direct routes that redirect to dashboard paths */}
          <Route path="/donor" element={<Navigate to="/dashboard/donor" replace />} />
          <Route path="/receiver" element={<Navigate to="/dashboard/receiver" replace />} />
          <Route path="/volunteer" element={<Navigate to="/dashboard/volunteer" replace />} />

          <Route
            path="/dashboard/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout>
                  <ImpactDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
    </div>
  );
}

export default App;
