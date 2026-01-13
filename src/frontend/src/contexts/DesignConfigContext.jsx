import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import designConfigLocal from '../../design-config.local.json';

const DesignConfigContext = createContext();

export const useDesignConfig = () => {
  const context = useContext(DesignConfigContext);
  if (!context) {
    throw new Error('useDesignConfig must be used within DesignConfigProvider');
  }
  return context;
};

export const DesignConfigProvider = ({ children }) => {
  const [config, setConfig] = useState(designConfigLocal);
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState(() => {
    // Load theme from localStorage or default to 'light'
    const savedTheme = localStorage.getItem('theme');
    return savedTheme || 'light';
  });

  useEffect(() => {
    // Try to fetch from Coordinator if available
    const fetchDesignConfig = async () => {
      const coordinatorUrl = import.meta.env.VITE_COORDINATOR_URL;
      
      if (!coordinatorUrl) {
        // Use local config if Coordinator not configured
        return;
      }

      try {
        setLoading(true);
        const response = await axios.post(
          `${coordinatorUrl}/api/fill-content-metrics`,
          {
            requester_service: 'auth',
            payload: { request_type: 'design_config' },
            response: { design_config: true },
          }
        );

        if (response.data?.design_config) {
          setConfig(response.data.design_config);
        }
      } catch (error) {
        console.warn('Failed to fetch design config from Coordinator, using local config:', error);
        // Fallback to local config on error
      } finally {
        setLoading(false);
      }
    };

    fetchDesignConfig();
  }, []);

  // Save theme to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleSetTheme = (newTheme) => {
    setTheme(newTheme);
  };

  return (
    <DesignConfigContext.Provider value={{ config, loading, theme, setTheme: handleSetTheme }}>
      {children}
    </DesignConfigContext.Provider>
  );
};

