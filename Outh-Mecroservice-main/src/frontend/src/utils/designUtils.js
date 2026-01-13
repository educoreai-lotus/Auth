/**
 * Utility functions for applying design config to styles
 * All styles come from design-config.local.json (or Coordinator config)
 */

// Get responsive breakpoint (defaults to desktop)
const getResponsiveValue = (obj, breakpoint = 'desktop') => {
  if (!obj) return null;
  if (typeof obj === 'string' || typeof obj === 'number') return obj;
  return obj[breakpoint] || obj.desktop || obj.tablet || obj.mobile || Object.values(obj)[0];
};

// Get nested config value by path
export const getConfigValue = (config, path, fallback = null) => {
  const keys = path.split('.');
  let value = config;
  for (const key of keys) {
    value = value?.[key];
    if (value === undefined) return fallback;
  }
  return value ?? fallback;
};

// Get background color from config
export const getBackgroundColor = (config, path, mode = 'light') => {
  const value = getConfigValue(config, `modes.${mode}.${path}`);
  return value || getConfigValue(config, `modes.light.${path}`);
};

// Get text color from config
export const getTextColor = (config, path, mode = 'light') => {
  const value = getConfigValue(config, `modes.${mode}.${path}`);
  return value || getConfigValue(config, `modes.light.${path}`);
};

// Get typography styles
export const getTypographyStyles = (config, variant, mode = 'light') => {
  const scale = getConfigValue(config, 'global.typography.scale', {});
  const fontSizeKey = scale[variant] || variant;
  const fontSize = getConfigValue(config, `global.typography.fontSize.${fontSizeKey}`, {});
  const fontWeight = getConfigValue(config, 'global.typography.fontWeight', {});
  
  return {
    fontSize: fontSize?.size || '16px',
    lineHeight: fontSize?.lineHeight || '24px',
    letterSpacing: fontSize?.letterSpacing || '0',
    fontWeight: fontWeight.normal || '400',
  };
};

// Get spacing value
export const getSpacingValue = (config, size) => {
  return getConfigValue(config, `global.spacing.${size}`, size);
};

// Get component spacing (responsive)
export const getComponentSpacing = (config, component, type, breakpoint = 'desktop') => {
  const spacing = getConfigValue(config, `components.${component}.spacing.${type}`, {});
  return getResponsiveValue(spacing, breakpoint);
};

// Apply button styles (returns inline style object)
export const applyButtonStyles = (config, variant = 'primary', breakpoint = 'desktop') => {
  const buttonConfig = getConfigValue(config, `modes.light.button.${variant}`, {});
  const globalButton = getConfigValue(config, 'modes.light.button', {});
  
  const padding = getResponsiveValue(globalButton?.spacing?.padding, breakpoint) || '12px 24px';
  const gap = getResponsiveValue(globalButton?.spacing?.gap, breakpoint) || '8px';
  const fontSize = getResponsiveValue(globalButton?.fontSize, breakpoint) || '16px';
  const lineHeight = getResponsiveValue(globalButton?.lineHeight, breakpoint) || '24px';
  const borderRadius = getConfigValue(config, 'global.borderRadius.scale.button', 'md');
  const borderRadiusValue = getConfigValue(config, `global.borderRadius.${borderRadius}`, '6px');
  
  return {
    backgroundColor: buttonConfig.background || buttonConfig.backgroundHover || '#047857',
    color: buttonConfig.text || '#ffffff',
    padding: padding,
    gap: gap,
    fontSize: fontSize,
    lineHeight: lineHeight,
    borderRadius: borderRadiusValue,
    border: buttonConfig.border === 'none' ? 'none' : buttonConfig.border || 'none',
    boxShadow: buttonConfig.shadow || 'none',
    transition: getConfigValue(config, 'global.transitions.properties.all', 'all 250ms ease-in-out'),
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    fontFamily: globalButton.fontFamily || getConfigValue(config, 'global.typography.fontFamily.primary'),
    fontWeight: globalButton.fontWeight || getConfigValue(config, 'global.typography.fontWeight.medium'),
  };
};

// Get button hover styles
export const getButtonHoverStyles = (config, variant = 'primary') => {
  const buttonConfig = getConfigValue(config, `modes.light.button.${variant}`, {});
  return {
    backgroundColor: buttonConfig.backgroundHover || buttonConfig.background || '#065f46',
    boxShadow: buttonConfig.shadowHover || buttonConfig.shadow || 'none',
  };
};

// Apply card styles (returns inline style object)
export const applyCardStyles = (config, breakpoint = 'desktop', theme = 'light') => {
  const cardConfig = getConfigValue(config, 'components.card', {});
  
  const padding = getResponsiveValue(cardConfig?.spacing?.padding, breakpoint) || '24px';
  const margin = getResponsiveValue(cardConfig?.spacing?.margin, breakpoint) || '16px';
  const gap = getResponsiveValue(cardConfig?.spacing?.gap, breakpoint) || '20px';
  const maxWidth = getResponsiveValue(cardConfig?.maxWidth, breakpoint) || '600px';
  const borderRadius = getConfigValue(config, 'global.borderRadius.scale.card', 'lg');
  const borderRadiusValue = getConfigValue(config, `global.borderRadius.${borderRadius}`, '8px');
  
  // Theme-aware colors
  const backgroundColor = theme === 'dark'
    ? (cardConfig.surface?.dark || getBackgroundColor(config, 'background.card', 'dark'))
    : (cardConfig.surface?.light || getBackgroundColor(config, 'background.card', 'light'));
  
  const border = theme === 'dark'
    ? (cardConfig.border?.dark || '1px solid rgba(255, 255, 255, 0.1)')
    : (cardConfig.border?.light || '1px solid #e2e8f0');
  
  const boxShadow = theme === 'dark'
    ? (cardConfig.shadow?.dark || getConfigValue(config, 'global.shadows.md'))
    : (cardConfig.shadow?.light || getConfigValue(config, 'global.shadows.md'));
  
  return {
    backgroundColor: backgroundColor,
    border: border,
    borderRadius: borderRadiusValue,
    boxShadow: boxShadow,
    padding: padding,
    margin: `0 ${margin}`,
    width: getResponsiveValue(cardConfig?.width, breakpoint) || '100%',
    maxWidth: maxWidth,
  };
};

// Apply alert/error styles
export const applyAlertStyles = (config, variant = 'error', breakpoint = 'desktop') => {
  const alertConfig = getConfigValue(config, 'components.alerts', {});
  const variantConfig = getConfigValue(config, `components.alerts.variants.${variant}`, {});
  const mode = 'light';
  
  const padding = getResponsiveValue(alertConfig?.spacing?.padding, breakpoint) || '16px';
  const gap = getResponsiveValue(alertConfig?.spacing?.gap, breakpoint) || '12px';
  const borderRadius = getConfigValue(config, 'global.borderRadius.scale.component', 'md');
  const borderRadiusValue = getConfigValue(config, `global.borderRadius.${borderRadius}`, '6px');
  
  return {
    backgroundColor: variantConfig.background?.light || '#fee2e2',
    border: variantConfig.border?.light || '1px solid #fca5a5',
    borderRadius: borderRadiusValue,
    padding: padding,
    gap: gap,
    display: 'flex',
    alignItems: 'flex-start',
  };
};

// Get alert text color
export const getAlertTextColor = (config, variant = 'error') => {
  const variantConfig = getConfigValue(config, `components.alerts.variants.${variant}`, {});
  return variantConfig.text?.light || '#b91c1c';
};

// Get alert icon size
export const getAlertIconSize = (config) => {
  const alertConfig = getConfigValue(config, 'components.alerts', {});
  return alertConfig.icon?.size || '20px';
};

// Get button icon size
export const getButtonIconSize = (config, breakpoint = 'desktop') => {
  const buttonConfig = getConfigValue(config, 'modes.light.button', {});
  const iconSize = getResponsiveValue(buttonConfig?.icon?.size, breakpoint) || '16px';
  return iconSize;
};

