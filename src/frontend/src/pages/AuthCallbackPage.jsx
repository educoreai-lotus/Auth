import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthCallbackPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // This page handles OAuth callbacks
    // The backend redirects here after successful authentication
    // The actual callback processing happens on the backend
    // This is just a loading state
    setTimeout(() => {
      navigate('/auth/success');
    }, 2000);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Completing authentication...</p>
      </div>
    </div>
  );
};

export default AuthCallbackPage;

