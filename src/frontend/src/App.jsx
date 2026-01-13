import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import AuthSuccessPage from './pages/AuthSuccessPage';
import { DesignConfigProvider } from './contexts/DesignConfigContext';

// Component to preserve query parameters when redirecting from root to login
function RootRedirect() {
  const location = useLocation();
  const search = location.search; // Preserve query parameters (e.g., ?error=...)
  return <Navigate to={`/login${search}`} replace />;
}

function App() {
  return (
    <DesignConfigProvider>
      <Router>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/auth/success" element={<AuthSuccessPage />} />
        </Routes>
      </Router>
    </DesignConfigProvider>
  );
}

export default App;

