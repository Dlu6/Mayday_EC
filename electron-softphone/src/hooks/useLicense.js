/**
 * useLicense Hook for Electron Softphone
 * 
 * Custom hook for accessing and managing license state in the electron-softphone.
 * Fetches license from the server and provides feature checking utilities.
 * Now includes real-time socket updates for license changes.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { storageService } from '../services/storageService';
import serverConfig from '../config/serverConfig';
import websocketService from '../services/websocketService';
import {
  hasFeature,
  isMenuItemAccessible,
  isLicenseValid,
  isDevelopmentLicense,
  getEnabledFeatures,
  getDisabledFeatures,
  parseFeatures,
  filterMenuItemsByLicense,
  FEATURE_KEYS,
} from '../utils/licenseFeatures';

// Cache for license data
let licenseCache = null;
let licenseCacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Hook for accessing license state and feature validation in electron-softphone
 * @returns {Object} License state and utility functions
 */
const useLicense = () => {
  const [license, setLicense] = useState(licenseCache);
  const [isLoading, setIsLoading] = useState(!licenseCache);
  const [error, setError] = useState(null);

  // Fetch license from server
  const fetchLicense = useCallback(async (forceRefresh = false) => {
    // Check cache validity
    const now = Date.now();
    if (!forceRefresh && licenseCache && (now - licenseCacheTimestamp) < CACHE_TTL) {
      setLicense(licenseCache);
      setIsLoading(false);
      return licenseCache;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = storageService.getAuthToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${serverConfig.apiUrl}/api/license/current`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch license: ${response.status}`);
      }

      const data = await response.json();

      // Debug: Log the received license data to verify features are present
      if (data.licensed && data.license) {
        // console.log('[useLicense] License received:', {
        //   organization: data.license.organization_name,
        //   status: data.license.status,
        //   hasTopLevelFeatures: !!data.license.features,
        //   hasNestedFeatures: !!data.license.license_type?.features,
        //   features: data.license.features || data.license.license_type?.features,
        // });
      }

      if (data.licensed && data.license) {
        licenseCache = data.license;
        licenseCacheTimestamp = now;
        setLicense(data.license);
        return data.license;
      } else {
        setLicense(null);
        return null;
      }
    } catch (err) {
      console.error('[useLicense] Error fetching license:', err);
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch license on mount
  useEffect(() => {
    fetchLicense();
  }, [fetchLicense]);

  // Listen for real-time license updates via socket
  useEffect(() => {
    const handleLicenseUpdate = (data) => {
      console.log('[useLicense] Received license update via socket:', data);

      // Clear the cache to force a fresh fetch
      licenseCache = null;
      licenseCacheTimestamp = 0;

      // Refetch license from server
      fetchLicense(true);
    };

    // Get the socket from websocketService
    const socket = websocketService.socket;

    if (socket) {
      console.log('[useLicense] Setting up socket listeners for license updates');
      socket.on('license:updated', handleLicenseUpdate);
      socket.on('license:update', handleLicenseUpdate);
    }

    // Also listen for connection events to set up listeners when socket connects
    const handleConnected = () => {
      const newSocket = websocketService.socket;
      if (newSocket) {
        console.log('[useLicense] Socket connected, setting up license listeners');
        newSocket.on('license:updated', handleLicenseUpdate);
        newSocket.on('license:update', handleLicenseUpdate);
      }
    };

    websocketService.on('connection:connected', handleConnected);

    // Cleanup listeners on unmount
    return () => {
      const cleanupSocket = websocketService.socket;
      if (cleanupSocket) {
        cleanupSocket.off('license:updated', handleLicenseUpdate);
        cleanupSocket.off('license:update', handleLicenseUpdate);
      }
      websocketService.off('connection:connected', handleConnected);
    };
  }, [fetchLicense]);

  // Parse features from license
  const features = useMemo(() => {
    if (!license) return {};
    return parseFeatures(license.features || license.license_type?.features);
  }, [license]);

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

  // Check if a specific feature is enabled
  const checkFeature = useCallback((featureKey) => {
    return hasFeature(license, featureKey);
  }, [license]);

  // Check if a menu item is accessible
  const checkMenuItem = useCallback((menuId) => {
    return isMenuItemAccessible(license, menuId);
  }, [license]);

  // Filter menu items by license
  const filterMenuItems = useCallback((menuItems) => {
    return filterMenuItemsByLicense(menuItems, license);
  }, [license]);

  // Refresh license data
  const refreshLicense = useCallback(() => {
    return fetchLicense(true);
  }, [fetchLicense]);

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
    isLicensed: Boolean(license),

    // Feature arrays
    enabledFeatures,
    disabledFeatures,

    // Utility functions
    checkFeature,
    checkMenuItem,
    filterMenuItems,
    refreshLicense,

    // Feature key constants for convenience
    FEATURE_KEYS,
  };
};

/**
 * Clear the license cache (call on logout)
 */
export const clearLicenseCache = () => {
  licenseCache = null;
  licenseCacheTimestamp = 0;
};

export default useLicense;
