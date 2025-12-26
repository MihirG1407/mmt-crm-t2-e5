
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import DashboardHome from './pages/dashboard/DashboardHome';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import Partners from './pages/partners/Partners';
import Opportunities from './pages/opportunities/Opportunities';
import Rfp from './pages/rfp/Rfp';
import Profile from './pages/profile/Profile';
import Settings from './pages/settings/Settings';

function App() {
  React.useEffect(() => {
    // Check local storage or default to true (Dark Mode)
    const savedMode = localStorage.getItem('darkMode');
    const isDark = savedMode === null || savedMode === 'true';

    if (isDark) {
      document.documentElement.classList.add('dark');
      if (savedMode === null) localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardHome />} />
              <Route path="/partners" element={<Partners />} />
              <Route path="/opportunities" element={<Opportunities />} />
              <Route path="/rfp" element={<Rfp />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
