/**
 * FeatureGate Component for Electron Softphone
 * 
 * A component that conditionally renders its children based on license features.
 * Provides a consistent way to restrict UI components based on the current license.
 * 
 * Usage:
 * <FeatureGate feature="whatsapp">
 *   <WhatsAppComponent />
 * </FeatureGate>
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Box, Typography, Alert, Tooltip, Paper } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import useLicense from '../hooks/useLicense';
import { FEATURE_DISPLAY_NAMES } from '../utils/licenseFeatures';

/**
 * Default fallback component shown when a feature is not available
 */
const DefaultFallback = ({ featureName }) => {
  return (
    <Paper
      elevation={0}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 4,
        textAlign: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.02)',
        borderRadius: 2,
        border: '1px dashed rgba(0, 0, 0, 0.12)',
        minHeight: 200,
        width: '100%',
      }}
    >
      <LockIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
      <Typography variant="h6" color="text.secondary" gutterBottom>
        {featureName} is not available
      </Typography>
      <Typography variant="body2" color="text.disabled" sx={{ mb: 2, maxWidth: 400 }}>
        This feature is not included in your current license plan.
        Please contact your administrator to upgrade your license.
      </Typography>
    </Paper>
  );
};

DefaultFallback.propTypes = {
  featureName: PropTypes.string.isRequired,
};

/**
 * Compact fallback for inline/small components
 */
const CompactFallback = ({ featureName }) => {
  return (
    <Tooltip title={`${featureName} requires a license upgrade`}>
      <Alert 
        severity="info" 
        icon={<LockIcon fontSize="small" />}
        sx={{ py: 0.5, width: '100%' }}
      >
        <Typography variant="caption">
          {featureName} not available in your plan
        </Typography>
      </Alert>
    </Tooltip>
  );
};

CompactFallback.propTypes = {
  featureName: PropTypes.string.isRequired,
};

/**
 * FeatureGate Component
 * 
 * Conditionally renders children based on license feature availability.
 */
const FeatureGate = ({
  feature,
  children,
  fallback,
  showFallback = true,
  compact = false,
  disabled = false,
  onFeatureBlocked,
}) => {
  const { checkFeature, isLoading, isLicensed } = useLicense();
  
  // Get feature display name
  const featureName = FEATURE_DISPLAY_NAMES[feature] || feature;
  
  // If no feature specified, always render children
  if (!feature) {
    return children;
  }
  
  // While loading, render nothing or a loading state
  if (isLoading) {
    return null;
  }
  
  // Check if feature is available
  const hasAccess = checkFeature(feature);
  
  // If feature is available, render children
  if (hasAccess) {
    return children;
  }
  
  // Feature is not available
  if (onFeatureBlocked) {
    onFeatureBlocked(feature, featureName);
  }
  
  // If disabled mode, render children with disabled styling
  if (disabled) {
    return (
      <Tooltip title={`${featureName} requires a license upgrade`}>
        <Box sx={{ opacity: 0.5, pointerEvents: 'none' }}>
          {children}
        </Box>
      </Tooltip>
    );
  }
  
  // If no fallback should be shown, return null
  if (!showFallback) {
    return null;
  }
  
  // Render custom fallback if provided
  if (fallback) {
    return fallback;
  }
  
  // Render default fallback
  if (compact) {
    return <CompactFallback featureName={featureName} />;
  }
  
  return (
    <DefaultFallback 
      featureKey={feature}
      featureName={featureName}
      showUpgradeButton={isLicensed}
    />
  );
};

FeatureGate.propTypes = {
  feature: PropTypes.string,
  children: PropTypes.node.isRequired,
  fallback: PropTypes.node,
  showFallback: PropTypes.bool,
  compact: PropTypes.bool,
  disabled: PropTypes.bool,
  onFeatureBlocked: PropTypes.func,
};

/**
 * Higher-Order Component version of FeatureGate
 */
export const withFeatureGate = (Component, feature, options = {}) => {
  const WrappedComponent = (props) => (
    <FeatureGate feature={feature} {...options}>
      <Component {...props} />
    </FeatureGate>
  );
  
  WrappedComponent.displayName = `FeatureGate(${Component.displayName || Component.name || 'Component'})`;
  
  return WrappedComponent;
};

/**
 * Hook version for programmatic feature checking
 */
export const useFeatureAccess = (feature) => {
  const { checkFeature, isLoading, isLicensed } = useLicense();
  
  const canAccess = React.useMemo(() => {
    if (isLoading) return false;
    if (!feature) return true;
    return checkFeature(feature);
  }, [feature, checkFeature, isLoading]);
  
  const handleBlockedAccess = React.useCallback((callback) => {
    if (!canAccess && callback) {
      callback(feature, FEATURE_DISPLAY_NAMES[feature] || feature);
    }
    return canAccess;
  }, [canAccess, feature]);
  
  return {
    canAccess,
    isLoading,
    isLicensed,
    handleBlockedAccess,
    featureName: FEATURE_DISPLAY_NAMES[feature] || feature,
  };
};

export default FeatureGate;
