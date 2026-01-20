/**
 * License Features Definition and Utilities
 * 
 * This module defines all available license features and provides utilities
 * for checking feature availability. It serves as the single source of truth
 * for feature definitions across the application.
 * 
 * Features are synced from the master license server (Mayday-Website).
 */

// All available features - aligned with master license server
export const FEATURE_KEYS = {
  CALLS: 'calls',
  RECORDING: 'recording',
  VOICEMAIL: 'voicemail',
  VIDEO: 'video',
  SMS: 'sms',
  TRANSFERS: 'transfers',
  CONFERENCES: 'conferences',
  REPORTS: 'reports',
  CRM: 'crm',
  WHATSAPP: 'whatsapp',
  SALESFORCE: 'salesforce',
  ZOHO: 'zoho',
  TWILIO: 'twilio',
  EMAIL: 'email',
  FACEBOOK: 'facebook',
  THIRD_PARTY_INTEGRATIONS: 'third_party_integrations',
  WEBRTC_EXTENSION: 'webrtc_extension',
};

// Feature display names for UI
export const FEATURE_DISPLAY_NAMES = {
  [FEATURE_KEYS.CALLS]: 'Calls',
  [FEATURE_KEYS.RECORDING]: 'Call Recording',
  [FEATURE_KEYS.VOICEMAIL]: 'Voicemail',
  [FEATURE_KEYS.VIDEO]: 'Video Calling',
  [FEATURE_KEYS.SMS]: 'SMS Messaging',
  [FEATURE_KEYS.TRANSFERS]: 'Call Transfers',
  [FEATURE_KEYS.CONFERENCES]: 'Conference Calls',
  [FEATURE_KEYS.REPORTS]: 'Reports & Analytics',
  [FEATURE_KEYS.CRM]: 'CRM Integration',
  [FEATURE_KEYS.WHATSAPP]: 'WhatsApp Integration',
  [FEATURE_KEYS.SALESFORCE]: 'Salesforce Integration',
  [FEATURE_KEYS.ZOHO]: 'Zoho Integration',
  [FEATURE_KEYS.TWILIO]: 'Twilio Integration',
  [FEATURE_KEYS.EMAIL]: 'Email Integration',
  [FEATURE_KEYS.FACEBOOK]: 'Facebook Integration',
  [FEATURE_KEYS.THIRD_PARTY_INTEGRATIONS]: 'Third-Party Integrations',
  [FEATURE_KEYS.WEBRTC_EXTENSION]: 'WebRTC Extension',
};

// Feature descriptions for tooltips
export const FEATURE_DESCRIPTIONS = {
  [FEATURE_KEYS.CALLS]: 'Core SIP calling functionalities',
  [FEATURE_KEYS.RECORDING]: 'Call recording & review capabilities',
  [FEATURE_KEYS.VOICEMAIL]: 'Voicemail management system',
  [FEATURE_KEYS.VIDEO]: 'Video calling capabilities',
  [FEATURE_KEYS.SMS]: 'SMS messaging integration',
  [FEATURE_KEYS.TRANSFERS]: 'Attended and blind call transfers',
  [FEATURE_KEYS.CONFERENCES]: 'Multi-party conference calls',
  [FEATURE_KEYS.REPORTS]: 'Analytics & reporting dashboard',
  [FEATURE_KEYS.CRM]: 'Contact management & CRM integration',
  [FEATURE_KEYS.WHATSAPP]: 'WhatsApp messaging integration',
  [FEATURE_KEYS.SALESFORCE]: 'Salesforce CRM integration',
  [FEATURE_KEYS.ZOHO]: 'Zoho CRM integration',
  [FEATURE_KEYS.TWILIO]: 'Twilio service integration',
  [FEATURE_KEYS.EMAIL]: 'Email integration',
  [FEATURE_KEYS.FACEBOOK]: 'Facebook Messenger integration',
  [FEATURE_KEYS.THIRD_PARTY_INTEGRATIONS]: 'Third-party system integrations',
  [FEATURE_KEYS.WEBRTC_EXTENSION]: 'WebRTC browser extension for softphone',
};

// Route to feature mapping for client application
export const ROUTE_FEATURE_MAP = {
  // Dashboard is always available
  '/dashboard': null,

  // Voice routes
  '/voice': FEATURE_KEYS.CALLS,
  '/voice/voiceQueues': FEATURE_KEYS.CALLS,
  '/voice/inboundRoutes': FEATURE_KEYS.CALLS,
  '/voice/outboundRoutes': FEATURE_KEYS.CALLS,
  '/voice/recordings': FEATURE_KEYS.RECORDING,
  '/voice/realtime': FEATURE_KEYS.CALLS,

  // Analytics
  '/analytics': FEATURE_KEYS.REPORTS,
  '/analytics/reports': FEATURE_KEYS.REPORTS,

  // Integrations
  '/integrations': FEATURE_KEYS.THIRD_PARTY_INTEGRATIONS,
  '/integrations/salesforceAccount': FEATURE_KEYS.SALESFORCE,
  '/whatsapp': FEATURE_KEYS.WHATSAPP,

  // IVR routes
  '/ivr': FEATURE_KEYS.CALLS,
  '/ivr/projects': FEATURE_KEYS.CALLS,
  '/ivr/odbc': FEATURE_KEYS.CALLS,

  // Tools - generally available with calls
  '/tools': FEATURE_KEYS.CALLS,
  '/tools/trunks': FEATURE_KEYS.CALLS,
  '/tools/audio': FEATURE_KEYS.CALLS,
  '/tools/intervals': FEATURE_KEYS.CALLS,

  // Settings - always available
  '/settings': null,
  '/settings/networks': null,
  '/settings/license': null,

  // Staff/Agents
  '/staff': null,
  '/agents': null,

  // Support - always available
  '/support': null,
  '/support/about': null,

  // Profile - always available
  '/profile': null,
};

// Menu item to feature mapping for electron-softphone
export const MENU_FEATURE_MAP = {
  // Dashboard is always available
  dashboard: null,

  // Call-related features
  callHistory: FEATURE_KEYS.CALLS,
  agentDirectory: FEATURE_KEYS.CALLS,
  transferHistory: FEATURE_KEYS.TRANSFERS,

  // Reports
  reports: FEATURE_KEYS.REPORTS,

  // Agent status - always available
  agentStatus: null,

  // Tickets - always available
  tickets: null,

  // Integrations
  whatsapp: FEATURE_KEYS.WHATSAPP,
  email: FEATURE_KEYS.EMAIL,
  facebook: FEATURE_KEYS.FACEBOOK,

  // Info and updates - always available
  info: null,
  updates: null,
  logout: null,
};

/**
 * Parse features from license object
 * Handles both string and object formats
 * @param {Object|string} features - Features from license
 * @returns {Object} Parsed features object
 */
export const parseFeatures = (features) => {
  if (!features) return {};

  if (typeof features === 'string') {
    try {
      return JSON.parse(features);
    } catch (error) {
      console.error('[LicenseFeatures] Error parsing features JSON:', error);
      return {};
    }
  }

  return features;
};

/**
 * Check if a specific feature is enabled in the license
 * @param {Object} license - License object with features
 * @param {string} featureKey - Feature key to check
 * @returns {boolean} Whether the feature is enabled
 */
export const hasFeature = (license, featureKey) => {
  if (!license) return false;
  if (!featureKey) return true; // No feature requirement means always allowed

  // Handle nested license structure
  const features = license.features || license.license_type?.features || {};
  const parsedFeatures = parseFeatures(features);

  return Boolean(parsedFeatures[featureKey]);
};

/**
 * Check if a route is accessible based on license features
 * @param {Object} license - License object
 * @param {string} path - Route path
 * @returns {boolean} Whether the route is accessible
 */
export const isRouteAccessible = (license, path) => {
  const requiredFeature = ROUTE_FEATURE_MAP[path];

  // No feature requirement means always accessible
  if (!requiredFeature) return true;

  return hasFeature(license, requiredFeature);
};

/**
 * Check if a menu item is accessible based on license features
 * @param {Object} license - License object
 * @param {string} menuId - Menu item ID
 * @returns {boolean} Whether the menu item is accessible
 */
export const isMenuItemAccessible = (license, menuId) => {
  const requiredFeature = MENU_FEATURE_MAP[menuId];

  // No feature requirement means always accessible
  if (!requiredFeature) return true;

  return hasFeature(license, requiredFeature);
};

/**
 * Get all enabled features from a license
 * @param {Object} license - License object
 * @returns {string[]} Array of enabled feature keys
 */
export const getEnabledFeatures = (license) => {
  if (!license) return [];

  const features = license.features || license.license_type?.features || {};
  const parsedFeatures = parseFeatures(features);

  return Object.entries(parsedFeatures)
    .filter(([_, enabled]) => enabled)
    .map(([key]) => key);
};

/**
 * Get all disabled features from a license
 * @param {Object} license - License object
 * @returns {string[]} Array of disabled feature keys
 */
export const getDisabledFeatures = (license) => {
  if (!license) return Object.values(FEATURE_KEYS);

  const features = license.features || license.license_type?.features || {};
  const parsedFeatures = parseFeatures(features);

  return Object.entries(parsedFeatures)
    .filter(([_, enabled]) => !enabled)
    .map(([key]) => key);
};

/**
 * Filter routes based on license features
 * @param {Array} routes - Array of route objects
 * @param {Object} license - License object
 * @returns {Array} Filtered routes
 */
export const filterRoutesByLicense = (routes, license) => {
  if (!routes || !Array.isArray(routes)) return [];

  return routes.reduce((acc, route) => {
    // Check if the route itself is accessible
    if (!isRouteAccessible(license, route.path)) {
      return acc;
    }

    // If the route has children, filter them as well
    if (route.children && Array.isArray(route.children)) {
      const filteredChildren = route.children.filter(child =>
        isRouteAccessible(license, child.path)
      );

      // Only include the parent if it has accessible children or is itself accessible
      if (filteredChildren.length > 0) {
        acc.push({
          ...route,
          children: filteredChildren,
        });
      }
    } else {
      acc.push(route);
    }

    return acc;
  }, []);
};

/**
 * Filter menu items based on license features
 * @param {Array} menuItems - Array of menu item objects
 * @param {Object} license - License object
 * @returns {Array} Filtered menu items
 */
export const filterMenuItemsByLicense = (menuItems, license) => {
  if (!menuItems || !Array.isArray(menuItems)) return [];

  return menuItems.filter(item => isMenuItemAccessible(license, item.id));
};

/**
 * Get the required feature for a route
 * @param {string} path - Route path
 * @returns {string|null} Feature key or null if no feature required
 */
export const getRouteRequiredFeature = (path) => {
  return ROUTE_FEATURE_MAP[path] || null;
};

/**
 * Get the required feature for a menu item
 * @param {string} menuId - Menu item ID
 * @returns {string|null} Feature key or null if no feature required
 */
export const getMenuItemRequiredFeature = (menuId) => {
  return MENU_FEATURE_MAP[menuId] || null;
};

/**
 * Check if license is valid (active and not expired)
 * @param {Object} license - License object
 * @returns {boolean} Whether the license is valid
 */
export const isLicenseValid = (license) => {
  if (!license) return false;

  // Check status
  if (license.status !== 'active') return false;

  // Check expiration
  if (license.expires_at) {
    const expiresAt = new Date(license.expires_at);
    if (expiresAt < new Date()) return false;
  }

  return true;
};

/**
 * Check if license is a development/trial license
 * @param {Object} license - License object
 * @returns {boolean} Whether it's a development license
 */
export const isDevelopmentLicense = (license) => {
  if (!license) return false;

  return (
    license.organization_name === 'Development License' ||
    license.license_type_name === 'Development' ||
    license.license_type?.name === 'Development' ||
    license.master_license_id === '0' ||
    license.master_license_id === 0
  );
};

export default {
  FEATURE_KEYS,
  FEATURE_DISPLAY_NAMES,
  FEATURE_DESCRIPTIONS,
  ROUTE_FEATURE_MAP,
  MENU_FEATURE_MAP,
  parseFeatures,
  hasFeature,
  isRouteAccessible,
  isMenuItemAccessible,
  getEnabledFeatures,
  getDisabledFeatures,
  filterRoutesByLicense,
  filterMenuItemsByLicense,
  getRouteRequiredFeature,
  getMenuItemRequiredFeature,
  isLicenseValid,
  isDevelopmentLicense,
};
