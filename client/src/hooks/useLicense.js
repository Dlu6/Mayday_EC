/**
 * useLicense Hook
 * 
 * Custom hook for accessing and managing license state in the client application.
 * Provides license data, feature checking utilities, and loading states.
 */

import { useEffect, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchCurrentLicense } from '../features/licenses/licenseSlice';
import {
  hasFeature,
  isRouteAccessible,
  isLicenseValid,
  isDevelopmentLicense,
  getEnabledFeatures,
  getDisabledFeatures,
  parseFeatures,
  FEATURE_KEYS,
} from '../utils/licenseFeatures';

/**
 * Hook for accessing license state and feature validation
 * @returns {Object} License state and utility functions
 */
const useLicense = () => {
  const dispatch = useDispatch();
  
  // Get license state from Redux
  const {
    currentLicense,
    loadingCurrentLicense,
    error,
  } = useSelector((state) => state.licenses);
  
  // Derived license data
  const license = useMemo(() => {
    if (!currentLicense?.licensed) return null;
    return currentLicense.license;
  }, [currentLicense]);
  
  // Parse features from license
  const features = useMemo(() => {
    if (!license) return {};
    return parseFeatures(license.features || license.license_type?.features);
  }, [license]);
  
  // Loading state
  const isLoading = useMemo(() => {
    return loadingCurrentLicense === 'pending' || loadingCurrentLicense === 'idle';
  }, [loadingCurrentLicense]);
  
  // License validity
  const isValid = useMemo(() => {
    return isLicenseValid(license);
  }, [license]);
  
  // Is development/trial license
  const isDevelopment = useMemo(() => {
    return isDevelopmentLicense(license);
  }, [license]);
  
  // Enabled features array
  const enabledFeatures = useMemo(() => {
    return getEnabledFeatures(license);
  }, [license]);
  
  // Disabled features array
  const disabledFeatures = useMemo(() => {
    return getDisabledFeatures(license);
  }, [license]);
  
  // Fetch license on mount
  useEffect(() => {
    if (loadingCurrentLicense === 'idle') {
      dispatch(fetchCurrentLicense());
    }
  }, [dispatch, loadingCurrentLicense]);
  
  // Refresh license data
  const refreshLicense = useCallback(() => {
    dispatch(fetchCurrentLicense());
  }, [dispatch]);
  
  // Check if a specific feature is enabled
  const checkFeature = useCallback((featureKey) => {
    return hasFeature(license, featureKey);
  }, [license]);
  
  // Check if a route is accessible
  const checkRoute = useCallback((path) => {
    return isRouteAccessible(license, path);
  }, [license]);
  
  // Get license info for display
  const licenseInfo = useMemo(() => {
    if (!license) return null;
    
    return {
      organizationName: license.organization_name,
      licenseType: license.license_type?.name || license.license_type_name,
      status: license.status,
      maxUsers: license.max_users,
      webrtcMaxUsers: license.webrtc_max_users,
      issuedAt: license.issued_at,
      expiresAt: license.expires_at,
      isDevelopment: isDevelopmentLicense(license),
    };
  }, [license]);
  
  return {
    // License data
    license,
    features,
    licenseInfo,
    
    // Loading and error states
    isLoading,
    error,
    
    // License status
    isValid,
    isDevelopment,
    isLicensed: Boolean(currentLicense?.licensed),
    
    // Feature arrays
    enabledFeatures,
    disabledFeatures,
    
    // Utility functions
    checkFeature,
    checkRoute,
    refreshLicense,
    
    // Feature key constants for convenience
    FEATURE_KEYS,
  };
};

export default useLicense;
