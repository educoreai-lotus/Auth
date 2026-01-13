import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { applyCardStyles } from '../utils/designUtils';
import { useDesignConfig } from '../contexts/DesignConfigContext';

const AuthSuccessPage = () => {
  const navigate = useNavigate();
  const { config } = useDesignConfig();
  const cardClass = applyCardStyles(config);

  useEffect(() => {
    // Redirect to main app after 3 seconds
    const timer = setTimeout(() => {
      // In production, redirect to the main application
      window.location.href = import.meta.env.VITE_APP_URL || '/';
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className={`${cardClass} max-w-md w-full mx-4 text-center`}>
        <div className="mb-4">
          <svg
            className="w-16 h-16 text-green-500 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-2">Authentication Successful!</h2>
        <p className="text-gray-600 mb-4">
          You have been successfully authenticated. Redirecting to the application...
        </p>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    </div>
  );
};

export default AuthSuccessPage;

