import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDesignConfig } from '../contexts/DesignConfigContext';

// Import project logos
import logoLight from '../assets/icons/logo-light-mood.jpeg';
import logoDark from '../assets/icons/logo-dark-mood.jpeg';

// Import theme toggle icons
import iconSun from '../assets/icons/icon-sun.svg';
import iconMoon from '../assets/icons/icon-moon.svg';

// Helper to get config value
const getConfigValue = (config, path, fallback = null) => {
  const keys = path.split('.');
  let value = config;
  for (const key of keys) {
    value = value?.[key];
    if (value === undefined) return fallback;
  }
  return value ?? fallback;
};

// Helper to get responsive value
const getResponsiveValue = (obj, breakpoint = 'desktop') => {
  if (!obj) return null;
  if (typeof obj === 'string' || typeof obj === 'number') return obj;
  return obj[breakpoint] || obj.desktop || obj.tablet || obj.mobile || Object.values(obj)[0];
};

const Header = () => {
  const { config, theme, setTheme } = useDesignConfig();
  const navigate = useNavigate();
  const [breakpoint, setBreakpoint] = useState('desktop');
  const [isHovering, setIsHovering] = useState(false);

  // Detect breakpoint
  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      if (width >= 1280) setBreakpoint('wide');
      else if (width >= 1024) setBreakpoint('desktop');
      else if (width >= 768) setBreakpoint('tablet');
      else setBreakpoint('mobile');
    };
    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  const handleThemeToggle = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  // Get header config values from design config
  const headerConfig = getConfigValue(config, 'modes.light.header', {});
  const componentsHeader = getConfigValue(config, 'components.header', {});
  
  const height = headerConfig?.height || componentsHeader?.height || '80px';
  const maxWidth = headerConfig?.maxWidth || componentsHeader?.maxWidth || '1280px';
  const padding = getResponsiveValue(headerConfig?.padding, breakpoint) || 
                  getResponsiveValue(componentsHeader?.spacing?.padding, breakpoint) || 
                  (breakpoint === 'mobile' ? '16px' : breakpoint === 'tablet' ? '24px' : '32px');
  
  // Background with backdrop blur - matching bg-white/95 dark:bg-[#0f172a]/95
  const background = theme === 'dark'
    ? 'rgba(15, 23, 42, 0.95)' // dark:bg-[#0f172a]/95
    : 'rgba(255, 255, 255, 0.95)'; // bg-white/95
  
  // Border - matching border-gray-200 dark:border-white/10
  const border = theme === 'dark'
    ? '1px solid rgba(255, 255, 255, 0.1)' // dark:border-white/10
    : '1px solid #e2e8f0'; // border-gray-200
  
  // Shadow - matching shadow-lg
  const shadow = getConfigValue(config, 'global.shadows.lg', '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)');
  
  const zIndex = headerConfig?.zIndex || componentsHeader?.zIndex || 50;

  // Header container style - matching fixed top-0 left-0 right-0 z-50 w-full h-20 backdrop-blur-md...
  const headerStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: zIndex,
    width: '100%',
    height: height,
    backgroundColor: background,
    backdropFilter: 'blur(12px)', // backdrop-blur-md
    WebkitBackdropFilter: 'blur(12px)',
    borderBottom: border,
    boxShadow: shadow,
  };

  // Inner container style - matching w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
  const containerStyle = {
    width: '100%',
    maxWidth: maxWidth, // max-w-7xl = 1280px
    margin: '0 auto', // mx-auto
    padding: `0 ${padding}`, // px-4 sm:px-6 lg:px-8 (responsive)
    height: '100%',
  };

  // Inner flex container - matching flex items-center justify-between h-20
  const flexContainerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: height,
  };

  // Logo container style - matching flex items-center space-x-4
  const logoContainerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: getConfigValue(config, 'global.spacing.4', '16px'), // space-x-4
  };

  // Logo wrapper style - matching flex-shrink-0 h-20 w-auto relative
  const logoWrapperStyle = {
    flexShrink: 0,
    height: height, // h-20
    width: 'auto', // w-auto
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  };

  // Logo image style - matching h-full w-auto object-contain transition-all duration-300
  const logoImageStyle = {
    height: '100%', // h-full
    width: 'auto', // w-auto
    objectFit: 'contain', // object-contain
    transition: getConfigValue(config, 'global.transitions.properties.all', 'all 300ms ease-in-out'), // transition-all duration-300
  };

  // Navigation style - matching hidden md:flex items-center space-x-3
  const navigationStyle = {
    display: breakpoint === 'mobile' ? 'none' : 'flex', // hidden md:flex
    alignItems: 'center',
    gap: getConfigValue(config, 'global.spacing.3', '12px'), // space-x-3
  };

  // Theme toggle button style - matching w-10 h-10 border rounded-full...
  const themeToggleStyle = {
    width: '40px', // w-10
    height: '40px', // h-10
    border: theme === 'dark' 
      ? '1px solid rgba(255, 255, 255, 0.1)' // dark:border-white/10
      : '1px solid #e2e8f0', // border-gray-200
    borderRadius: '50%', // rounded-full
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0,
    outline: 'none',
    transition: getConfigValue(config, 'global.transitions.properties.all', 'all 300ms ease-in-out'), // transition-all duration-300
    transform: isHovering ? 'scale(1.1)' : 'scale(1)', // hover:scale-110
    backgroundColor: theme === 'dark'
      ? '#1e293b' // dark:bg-[#1e293b]
      : '#f1f5f9', // bg-gray-100
  };

  // Theme toggle hover style
  const themeToggleHoverStyle = isHovering ? {
    backgroundColor: theme === 'dark'
      ? '#334155' // dark:hover:bg-[#334155]
      : '#d1fae5', // hover:bg-emerald-100
  } : {};

  const finalThemeToggleStyle = {
    ...themeToggleStyle,
    ...themeToggleHoverStyle,
  };

  // Icon style - matching text-sm
  const iconSize = '14px'; // text-sm
  const iconColor = theme === 'dark'
    ? '#f8fafc' // dark:text-[#f8fafc]
    : '#475569'; // text-gray-600

  // Get current project logo based on theme
  // Light mode: show light logo, Dark mode: show dark logo
  const currentLogo = theme === 'light' ? logoLight : logoDark;
  
  // Get current theme toggle icon - moon when in light mode (day-mode), sun when in dark mode
  // Matching: theme === 'day-mode' ? 'fa-moon' : 'fa-sun'
  // In our case: theme === 'light' (day-mode) shows moon, theme === 'dark' shows sun
  const currentToggleIcon = theme === 'light' ? iconMoon : iconSun;

  return (
    <header style={headerStyle}>
      <div style={containerStyle}>
        <div style={flexContainerStyle}>
          {/* EDUCORE AI Logo */}
          <div 
            style={{ ...logoContainerStyle, cursor: 'pointer' }}
            onClick={() => navigate('/')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate('/');
              }
            }}
            aria-label="Go to home page"
          >
            <div style={logoWrapperStyle}>
              <img
                key={theme} // Force re-render when theme changes
                src={currentLogo}
                alt="EDUCORE AI Logo"
                style={logoImageStyle}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}></div>
          </div>

          {/* Navigation */}
          <nav style={navigationStyle}>
            {/* Navigation items can be added here if needed */}
          </nav>

          {/* Theme Toggle */}
          <button
            onClick={handleThemeToggle}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            style={finalThemeToggleStyle}
            title="Toggle Theme"
            type="button"
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            <img
              src={currentToggleIcon}
              alt={theme === 'light' ? 'Moon icon' : 'Sun icon'}
              style={{
                width: iconSize,
                height: iconSize,
                display: 'block',
                color: iconColor,
                filter: theme === 'dark' ? 'invert(1)' : 'none',
              }}
            />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;

