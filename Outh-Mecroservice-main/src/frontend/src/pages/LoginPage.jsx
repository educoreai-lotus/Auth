import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDesignConfig } from '../contexts/DesignConfigContext';
import Header from '../components/Header';
import {
  applyButtonStyles,
  applyCardStyles,
  applyAlertStyles,
  getBackgroundColor,
  getTextColor,
  getTypographyStyles,
  getSpacingValue,
  getButtonHoverStyles,
  getAlertTextColor,
  getAlertIconSize,
  getButtonIconSize,
  getConfigValue,
} from '../utils/designUtils';

const LoginPage = () => {
  const { config, theme } = useDesignConfig();
  const [searchParams, setSearchParams] = useSearchParams();
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
  const [breakpoint, setBreakpoint] = useState('desktop');
  const [buttonHoverStates, setButtonHoverStates] = useState({});
  const [displayedErrorMessage, setDisplayedErrorMessage] = useState(null);
  
  // Track if we've already read the error on this mount cycle
  // This ensures we only read the error once on initial mount, not on every searchParams change
  const hasReadErrorRef = useRef(false);

  /**
   * Error handling logic:
   * 1. On initial page load only: Read error from URL, decode it, store in state, display it
   * 2. Keep error in URL while page is open (do NOT remove immediately)
   * 3. On page refresh: Clean the URL (error param removed)
   * 4. After refresh: React state resets naturally, no error shown
   * 
   * Flow:
   * - OAuth redirect → /login?error=... → Read error once, store in state, keep URL
   * - User refreshes → Component remounts → Clean URL immediately (don't read error)
   * - After refresh → URL clean, state null → No error shown
   */
  useEffect(() => {
    const errorFromUrl = searchParams.get('error');
    const isRefresh = performance.getEntriesByType('navigation')[0]?.type === 'reload';

    // On initial mount with error (OAuth redirect, not refresh): read error once and store in state
    if (errorFromUrl && !hasReadErrorRef.current && !isRefresh) {
      try {
        const decodedError = decodeURIComponent(errorFromUrl);
        setDisplayedErrorMessage(decodedError);
      } catch {
        setDisplayedErrorMessage(errorFromUrl);
      }
      hasReadErrorRef.current = true;
      // Do NOT remove error from URL here - keep it while page is open
      return; // Exit early, don't clean URL on initial read
    }
    
    // On refresh: if there's an error in URL, clean it immediately (don't read it)
    if (errorFromUrl && isRefresh) {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('error');
      setSearchParams(newSearchParams, { replace: true });
      hasReadErrorRef.current = false; // Reset for next potential error
      return;
    }
    
    // If no error in URL and we have a displayed error, clear it
    // This handles navigation away and back, or manual URL changes
    if (!errorFromUrl && displayedErrorMessage) {
      setDisplayedErrorMessage(null);
      hasReadErrorRef.current = false; // Reset ref for next potential error
    }
  }, [searchParams, setSearchParams, displayedErrorMessage]);

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

  const handleOAuthLogin = (provider) => {
    // Clear any displayed error message when starting new login
    setDisplayedErrorMessage(null);
    
    console.log(`[Frontend] Initiating OAuth login for: ${provider}`);
    console.log(`[Frontend] Redirecting to: ${backendUrl}/login/${provider}`);
    // OAuth requires browser redirect (not API call) because:
    // 1. OAuth providers redirect back to our callback URL
    // 2. Cookies need to be set in same domain context
    // 3. This is the standard OAuth 2.0 flow
    window.location.href = `${backendUrl}/login/${provider}`;
  };

  // Get header height for padding
  const headerHeight = config?.modes?.light?.header?.height || config?.components?.header?.height || '80px';
  
  // Get spacing values
  const spacing8 = getSpacingValue(config, '8') || '32px';
  const spacing6 = getSpacingValue(config, '6') || '24px';
  const spacing4 = getSpacingValue(config, '4') || '16px';
  const spacing3 = getSpacingValue(config, '3') || '12px';
  const spacing2 = getSpacingValue(config, '2') || '8px';
  
  // Get styles from config
  // Main container - two column layout (left: title/description, right: form)
  const containerStyle = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: getBackgroundColor(config, 'background.body', theme),
    paddingTop: headerHeight,
    padding: spacing8,
  };

  // Two column wrapper
  const twoColumnWrapperStyle = {
    width: '100%',
    maxWidth: getConfigValue(config, 'components.header.maxWidth', '1280px') || '1280px',
    display: 'flex',
    alignItems: 'center',
    gap: spacing8,
    flexDirection: breakpoint === 'mobile' ? 'column' : 'row',
  };


  // Left side - Title and Description
  const leftSideStyle = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: breakpoint === 'mobile' ? 'center' : 'flex-start',
    textAlign: breakpoint === 'mobile' ? 'center' : 'left',
    maxWidth: breakpoint === 'mobile' ? '100%' : '600px',
  };

  // Right side - Form Card
  const rightSideStyle = {
    flex: breakpoint === 'mobile' ? '1' : '0 0 auto',
    width: breakpoint === 'mobile' ? '100%' : 'auto',
    minWidth: breakpoint === 'mobile' ? 'auto' : '400px',
    maxWidth: breakpoint === 'mobile' ? '100%' : '500px',
    marginTop: breakpoint === 'mobile' ? '0' : spacing6,
  };

  const cardStyle = applyCardStyles(config, breakpoint, theme);

  const heading1Styles = getTypographyStyles(config, 'heading1');
  const heading5Styles = getTypographyStyles(config, 'heading5');
  const captionStyles = getTypographyStyles(config, 'caption');

  const primaryButtonStyle = applyButtonStyles(config, 'primary', breakpoint);
  const secondaryButtonStyle = applyButtonStyles(config, 'secondary', breakpoint);
  const buttonIconSize = getButtonIconSize(config, breakpoint);

  // For GitHub and LinkedIn, use available button variants from config
  // GitHub uses secondary variant (light gray), LinkedIn uses primary variant
  const githubButtonStyle = secondaryButtonStyle;
  const linkedinButtonStyle = primaryButtonStyle;

  const errorAlertStyle = applyAlertStyles(config, 'error', breakpoint);
  const errorTextColor = getAlertTextColor(config, 'error');
  const errorIconSize = getAlertIconSize(config);

  const handleButtonMouseEnter = (provider) => {
    setButtonHoverStates((prev) => ({ ...prev, [provider]: true }));
  };

  const handleButtonMouseLeave = (provider) => {
    setButtonHoverStates((prev) => ({ ...prev, [provider]: false }));
  };

  const getButtonStyle = (provider) => {
    let baseStyle = primaryButtonStyle;
    if (provider === 'github') baseStyle = githubButtonStyle;
    if (provider === 'linkedin') baseStyle = linkedinButtonStyle;

    if (buttonHoverStates[provider]) {
      const hoverStyle = getButtonHoverStyles(config, provider === 'github' ? 'secondary' : 'primary');
      return { ...baseStyle, ...hoverStyle };
    }
    return baseStyle;
  };

  return (
    <>
      <Header />
      <div style={containerStyle}>
        <div style={twoColumnWrapperStyle}>
          {/* Left Side - Title and Description */}
          <div style={leftSideStyle}>
            <h1
              style={{
                ...heading1Styles,
                fontSize: breakpoint === 'mobile' ? heading1Styles.fontSize : getConfigValue(config, 'global.typography.fontSize.5xl.size', '48px'),
                lineHeight: breakpoint === 'mobile' ? heading1Styles.lineHeight : getConfigValue(config, 'global.typography.fontSize.5xl.lineHeight', '60px'),
                fontWeight: config?.global?.typography?.fontWeight?.bold || '700',
                marginBottom: spacing4,
                color: getTextColor(config, 'text.primary', theme),
                margin: 0,
              }}
            >
              EDUCORE AI
            </h1>
            <p
              style={{
                ...getTypographyStyles(config, 'heading4'),
                color: getTextColor(config, 'text.secondary', theme),
                margin: 0,
                maxWidth: '500px',
              }}
            >
              Your intelligent learning platform for building, managing, and customizing courses
              and learning processes.
            </p>
          </div>

          {/* Right Side - Form Card */}
          <div style={rightSideStyle}>
            <div style={cardStyle}>
              <div style={{ marginBottom: spacing6 }}>
                <h2
                  style={{
                    ...heading5Styles,
                    fontWeight: config?.global?.typography?.fontWeight?.semibold || '600',
                    marginBottom: spacing4,
                    color: getTextColor(config, 'text.primary', theme),
                    textAlign: 'center',
                  }}
                >
                  Sign in to continue
                </h2>
                <p
                  style={{
                    ...captionStyles,
                    color: getTextColor(config, 'text.muted', theme),
                    marginBottom: spacing6,
                    textAlign: 'center',
                  }}
                >
                  Choose your preferred authentication method to access your account.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing3 }}>
                  <button
                    onClick={() => handleOAuthLogin('google')}
                    onMouseEnter={() => handleButtonMouseEnter('google')}
                    onMouseLeave={() => handleButtonMouseLeave('google')}
                    style={getButtonStyle('google')}
                  >
                    <svg
                      style={{ width: buttonIconSize, height: buttonIconSize, flexShrink: 0 }}
                      viewBox="0 0 24 24"
                    >
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </button>

                  <button
                    onClick={() => handleOAuthLogin('github')}
                    onMouseEnter={() => handleButtonMouseEnter('github')}
                    onMouseLeave={() => handleButtonMouseLeave('github')}
                    style={getButtonStyle('github')}
                  >
                    <svg
                      style={{ width: buttonIconSize, height: buttonIconSize, flexShrink: 0 }}
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                    Continue with GitHub
                  </button>

                  <button
                    onClick={() => handleOAuthLogin('linkedin')}
                    onMouseEnter={() => handleButtonMouseEnter('linkedin')}
                    onMouseLeave={() => handleButtonMouseLeave('linkedin')}
                    style={getButtonStyle('linkedin')}
                  >
                    <svg
                      style={{ width: buttonIconSize, height: buttonIconSize, flexShrink: 0 }}
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                    Continue with LinkedIn
                  </button>
                </div>

                {/* Error message display */}
                {displayedErrorMessage && (
                  <div style={{ ...errorAlertStyle, marginTop: spacing4 }}>
                    <svg
                      style={{
                        width: errorIconSize,
                        height: errorIconSize,
                        marginTop: '2px',
                        flexShrink: 0,
                        color: errorTextColor,
                      }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p
                      style={{
                        ...captionStyles,
                        color: errorTextColor,
                        margin: 0,
                      }}
                    >
                      {displayedErrorMessage}
                    </p>
                  </div>
                )}
              </div>

              <div
                style={{
                  marginTop: spacing8,
                  textAlign: 'center',
                  ...captionStyles,
                  color: getTextColor(config, 'text.muted', theme),
                }}
              >
                <p style={{ margin: 0 }}>
                  By continuing, you agree to our Terms of Service and Privacy Policy.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;

