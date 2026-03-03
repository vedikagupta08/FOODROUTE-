import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, Home, UtensilsCrossed, Users, BarChart3 } from 'lucide-react';

/**
 * Layout Component
 * Main layout wrapper with navigation and header
 */
const Layout = ({ children }) => {
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getRoleDashboard = () => {
    if (!userProfile) return '/dashboard';
    switch (userProfile.role) {
      case 'donor':
        return '/dashboard/donor';
      case 'receiver':
        return '/dashboard/receiver';
      case 'volunteer':
        return '/dashboard/volunteer';
      case 'admin':
        return '/dashboard/admin';
      default:
        return '/dashboard';
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="navbar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2 fade-in">
                <UtensilsCrossed className="h-8 w-8 text-primary-600" />
                <span className="text-xl font-bold text-gray-900">FoodRoute+</span>
              </Link>
            </div>

            {currentUser && (
              <nav className="flex items-center space-x-4">
                <Link
                  to={getRoleDashboard()}
                  className="nav-link text-gray-700 px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-1"
                >
                  <Home className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>

                {userProfile?.role === 'donor' && (
                  <Link
                    to="/dashboard/donor"
                    className="nav-link text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Donor
                  </Link>
                )}
                {userProfile?.role === 'receiver' && (
                  <Link
                    to="/dashboard/receiver"
                    className="nav-link text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Receiver
                  </Link>
                )}
                {userProfile?.role === 'volunteer' && (
                  <Link
                    to="/dashboard/volunteer"
                    className="nav-link text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Volunteer
                  </Link>
                )}
                {userProfile?.role === 'admin' && (
                  <Link
                    to="/dashboard/admin"
                    className="nav-link text-gray-700 px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-1"
                  >
                    <BarChart3 className="h-4 w-4" />
                    <span>Impact</span>
                  </Link>
                )}

                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2 text-sm text-gray-700">
                    <User className="h-4 w-4" />
                    <span>{userProfile?.name || currentUser.email}</span>
                    <span className="status-badge">
                      {userProfile?.role || 'user'}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="nav-link text-gray-700 hover:text-red-600 px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-1"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </nav>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="slide-up">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
