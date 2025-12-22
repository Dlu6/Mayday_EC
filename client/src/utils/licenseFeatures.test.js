/**
 * Unit Tests for License Features Utilities
 * 
 * Tests the license feature validation, route filtering, and menu filtering logic.
 */

import {
  FEATURE_KEYS,
  FEATURE_DISPLAY_NAMES,
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
} from './licenseFeatures';

describe('License Features Utilities', () => {
  // Sample license objects for testing
  const basicLicense = {
    organization_name: 'Test Org',
    status: 'active',
    expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
    features: {
      calls: true,
      recording: true,
      transfers: true,
      conferences: true,
      reports: true,
      crm: true,
      voicemail: false,
      video: false,
      sms: false,
      whatsapp: false,
      webrtc_extension: false,
    },
  };

  const enterpriseLicense = {
    organization_name: 'Enterprise Org',
    status: 'active',
    expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    features: {
      calls: true,
      recording: true,
      transfers: true,
      conferences: true,
      reports: true,
      crm: true,
      voicemail: true,
      video: true,
      sms: true,
      whatsapp: true,
      salesforce: true,
      zoho: true,
      twilio: true,
      email: true,
      facebook: true,
      third_party_integrations: true,
      webrtc_extension: true,
    },
  };

  const developmentLicense = {
    organization_name: 'Development License',
    status: 'active',
    license_type_name: 'Development',
    master_license_id: '0',
    expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    features: {
      calls: true,
      recording: false,
      transfers: false,
      conferences: false,
      reports: true,
      crm: true,
      whatsapp: false,
      webrtc_extension: true,
    },
  };

  const expiredLicense = {
    organization_name: 'Expired Org',
    status: 'expired',
    expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
    features: {
      calls: true,
      recording: true,
    },
  };

  const suspendedLicense = {
    organization_name: 'Suspended Org',
    status: 'suspended',
    expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    features: {
      calls: true,
      recording: true,
    },
  };

  describe('FEATURE_KEYS', () => {
    it('should contain all expected feature keys', () => {
      expect(FEATURE_KEYS.CALLS).toBe('calls');
      expect(FEATURE_KEYS.RECORDING).toBe('recording');
      expect(FEATURE_KEYS.WHATSAPP).toBe('whatsapp');
      expect(FEATURE_KEYS.WEBRTC_EXTENSION).toBe('webrtc_extension');
      expect(FEATURE_KEYS.TRANSFERS).toBe('transfers');
      expect(FEATURE_KEYS.REPORTS).toBe('reports');
    });
  });

  describe('FEATURE_DISPLAY_NAMES', () => {
    it('should have display names for all feature keys', () => {
      Object.values(FEATURE_KEYS).forEach((key) => {
        expect(FEATURE_DISPLAY_NAMES[key]).toBeDefined();
        expect(typeof FEATURE_DISPLAY_NAMES[key]).toBe('string');
      });
    });
  });

  describe('parseFeatures', () => {
    it('should return empty object for null/undefined input', () => {
      expect(parseFeatures(null)).toEqual({});
      expect(parseFeatures(undefined)).toEqual({});
    });

    it('should parse JSON string features', () => {
      const jsonFeatures = JSON.stringify({ calls: true, recording: false });
      const result = parseFeatures(jsonFeatures);
      expect(result).toEqual({ calls: true, recording: false });
    });

    it('should return object features as-is', () => {
      const objFeatures = { calls: true, recording: false };
      const result = parseFeatures(objFeatures);
      expect(result).toEqual(objFeatures);
    });

    it('should return empty object for invalid JSON', () => {
      const invalidJson = 'not valid json';
      const result = parseFeatures(invalidJson);
      expect(result).toEqual({});
    });
  });

  describe('hasFeature', () => {
    it('should return false for null license', () => {
      expect(hasFeature(null, FEATURE_KEYS.CALLS)).toBe(false);
    });

    it('should return true for null feature key (no restriction)', () => {
      expect(hasFeature(basicLicense, null)).toBe(true);
    });

    it('should return true for enabled features', () => {
      expect(hasFeature(basicLicense, FEATURE_KEYS.CALLS)).toBe(true);
      expect(hasFeature(basicLicense, FEATURE_KEYS.RECORDING)).toBe(true);
      expect(hasFeature(basicLicense, FEATURE_KEYS.TRANSFERS)).toBe(true);
    });

    it('should return false for disabled features', () => {
      expect(hasFeature(basicLicense, FEATURE_KEYS.WHATSAPP)).toBe(false);
      expect(hasFeature(basicLicense, FEATURE_KEYS.VIDEO)).toBe(false);
      expect(hasFeature(basicLicense, FEATURE_KEYS.WEBRTC_EXTENSION)).toBe(false);
    });

    it('should handle nested license_type.features structure', () => {
      const nestedLicense = {
        license_type: {
          features: { calls: true, whatsapp: true },
        },
      };
      expect(hasFeature(nestedLicense, FEATURE_KEYS.CALLS)).toBe(true);
      expect(hasFeature(nestedLicense, FEATURE_KEYS.WHATSAPP)).toBe(true);
    });

    it('should handle JSON string features', () => {
      const stringFeaturesLicense = {
        features: JSON.stringify({ calls: true, whatsapp: false }),
      };
      expect(hasFeature(stringFeaturesLicense, FEATURE_KEYS.CALLS)).toBe(true);
      expect(hasFeature(stringFeaturesLicense, FEATURE_KEYS.WHATSAPP)).toBe(false);
    });
  });

  describe('isRouteAccessible', () => {
    it('should return true for routes without feature requirements', () => {
      expect(isRouteAccessible(basicLicense, '/dashboard')).toBe(true);
      expect(isRouteAccessible(basicLicense, '/settings')).toBe(true);
      expect(isRouteAccessible(basicLicense, '/profile')).toBe(true);
    });

    it('should return true for routes with enabled features', () => {
      expect(isRouteAccessible(basicLicense, '/voice')).toBe(true);
      expect(isRouteAccessible(basicLicense, '/analytics/reports')).toBe(true);
    });

    it('should return false for routes with disabled features', () => {
      expect(isRouteAccessible(basicLicense, '/whatsapp')).toBe(false);
    });

    it('should return true for enterprise license with all features', () => {
      expect(isRouteAccessible(enterpriseLicense, '/whatsapp')).toBe(true);
      expect(isRouteAccessible(enterpriseLicense, '/integrations/salesforceAccount')).toBe(true);
    });
  });

  describe('isMenuItemAccessible', () => {
    it('should return true for menu items without feature requirements', () => {
      expect(isMenuItemAccessible(basicLicense, 'dashboard')).toBe(true);
      expect(isMenuItemAccessible(basicLicense, 'agentStatus')).toBe(true);
      expect(isMenuItemAccessible(basicLicense, 'info')).toBe(true);
    });

    it('should return true for menu items with enabled features', () => {
      expect(isMenuItemAccessible(basicLicense, 'callHistory')).toBe(true);
      expect(isMenuItemAccessible(basicLicense, 'reports')).toBe(true);
    });

    it('should return false for menu items with disabled features', () => {
      expect(isMenuItemAccessible(basicLicense, 'whatsapp')).toBe(false);
    });

    it('should return true for enterprise license with all features', () => {
      expect(isMenuItemAccessible(enterpriseLicense, 'whatsapp')).toBe(true);
      expect(isMenuItemAccessible(enterpriseLicense, 'transferHistory')).toBe(true);
    });
  });

  describe('getEnabledFeatures', () => {
    it('should return empty array for null license', () => {
      expect(getEnabledFeatures(null)).toEqual([]);
    });

    it('should return only enabled features', () => {
      const enabled = getEnabledFeatures(basicLicense);
      expect(enabled).toContain('calls');
      expect(enabled).toContain('recording');
      expect(enabled).toContain('transfers');
      expect(enabled).not.toContain('whatsapp');
      expect(enabled).not.toContain('video');
    });

    it('should return all features for enterprise license', () => {
      const enabled = getEnabledFeatures(enterpriseLicense);
      expect(enabled.length).toBeGreaterThan(10);
      expect(enabled).toContain('whatsapp');
      expect(enabled).toContain('webrtc_extension');
    });
  });

  describe('getDisabledFeatures', () => {
    it('should return all feature keys for null license', () => {
      const disabled = getDisabledFeatures(null);
      expect(disabled.length).toBe(Object.keys(FEATURE_KEYS).length);
    });

    it('should return only disabled features', () => {
      const disabled = getDisabledFeatures(basicLicense);
      expect(disabled).toContain('whatsapp');
      expect(disabled).toContain('video');
      expect(disabled).not.toContain('calls');
      expect(disabled).not.toContain('recording');
    });
  });

  describe('filterRoutesByLicense', () => {
    const sampleRoutes = [
      { name: 'Dashboard', path: '/dashboard' },
      { name: 'Voice', path: '/voice', children: [
        { name: 'Recordings', path: '/voice/recordings' },
        { name: 'Queues', path: '/voice/voiceQueues' },
      ]},
      { name: 'WhatsApp', path: '/whatsapp' },
      { name: 'Settings', path: '/settings' },
    ];

    it('should return empty array for null routes', () => {
      expect(filterRoutesByLicense(null, basicLicense)).toEqual([]);
    });

    it('should filter out routes with disabled features', () => {
      const filtered = filterRoutesByLicense(sampleRoutes, basicLicense);
      const paths = filtered.map(r => r.path);
      expect(paths).toContain('/dashboard');
      expect(paths).toContain('/voice');
      expect(paths).toContain('/settings');
      expect(paths).not.toContain('/whatsapp');
    });

    it('should keep all routes for enterprise license', () => {
      const filtered = filterRoutesByLicense(sampleRoutes, enterpriseLicense);
      expect(filtered.length).toBe(sampleRoutes.length);
    });

    it('should filter child routes as well', () => {
      const filtered = filterRoutesByLicense(sampleRoutes, basicLicense);
      const voiceRoute = filtered.find(r => r.path === '/voice');
      expect(voiceRoute).toBeDefined();
      expect(voiceRoute.children).toBeDefined();
    });
  });

  describe('filterMenuItemsByLicense', () => {
    const sampleMenuItems = [
      { id: 'dashboard', text: 'Dashboard' },
      { id: 'callHistory', text: 'Call History' },
      { id: 'whatsapp', text: 'WhatsApp' },
      { id: 'reports', text: 'Reports' },
    ];

    it('should return empty array for null menu items', () => {
      expect(filterMenuItemsByLicense(null, basicLicense)).toEqual([]);
    });

    it('should filter out menu items with disabled features', () => {
      const filtered = filterMenuItemsByLicense(sampleMenuItems, basicLicense);
      const ids = filtered.map(i => i.id);
      expect(ids).toContain('dashboard');
      expect(ids).toContain('callHistory');
      expect(ids).toContain('reports');
      expect(ids).not.toContain('whatsapp');
    });

    it('should keep all menu items for enterprise license', () => {
      const filtered = filterMenuItemsByLicense(sampleMenuItems, enterpriseLicense);
      expect(filtered.length).toBe(sampleMenuItems.length);
    });
  });

  describe('getRouteRequiredFeature', () => {
    it('should return null for routes without feature requirements', () => {
      expect(getRouteRequiredFeature('/dashboard')).toBeNull();
      expect(getRouteRequiredFeature('/settings')).toBeNull();
    });

    it('should return feature key for restricted routes', () => {
      expect(getRouteRequiredFeature('/whatsapp')).toBe(FEATURE_KEYS.WHATSAPP);
      expect(getRouteRequiredFeature('/voice/recordings')).toBe(FEATURE_KEYS.RECORDING);
    });
  });

  describe('getMenuItemRequiredFeature', () => {
    it('should return null for menu items without feature requirements', () => {
      expect(getMenuItemRequiredFeature('dashboard')).toBeNull();
      expect(getMenuItemRequiredFeature('agentStatus')).toBeNull();
    });

    it('should return feature key for restricted menu items', () => {
      expect(getMenuItemRequiredFeature('whatsapp')).toBe(FEATURE_KEYS.WHATSAPP);
      expect(getMenuItemRequiredFeature('reports')).toBe(FEATURE_KEYS.REPORTS);
    });
  });

  describe('isLicenseValid', () => {
    it('should return false for null license', () => {
      expect(isLicenseValid(null)).toBe(false);
    });

    it('should return true for active, non-expired license', () => {
      expect(isLicenseValid(basicLicense)).toBe(true);
      expect(isLicenseValid(enterpriseLicense)).toBe(true);
    });

    it('should return false for expired license', () => {
      expect(isLicenseValid(expiredLicense)).toBe(false);
    });

    it('should return false for suspended license', () => {
      expect(isLicenseValid(suspendedLicense)).toBe(false);
    });

    it('should return true for active license without expiration date', () => {
      const noExpiryLicense = { ...basicLicense, expires_at: null };
      expect(isLicenseValid(noExpiryLicense)).toBe(true);
    });
  });

  describe('isDevelopmentLicense', () => {
    it('should return false for null license', () => {
      expect(isDevelopmentLicense(null)).toBe(false);
    });

    it('should return true for Development License by organization name', () => {
      expect(isDevelopmentLicense(developmentLicense)).toBe(true);
    });

    it('should return true for license with master_license_id of 0', () => {
      const zeroIdLicense = { ...basicLicense, master_license_id: '0' };
      expect(isDevelopmentLicense(zeroIdLicense)).toBe(true);
      
      const numericZeroLicense = { ...basicLicense, master_license_id: 0 };
      expect(isDevelopmentLicense(numericZeroLicense)).toBe(true);
    });

    it('should return true for license with Development type name', () => {
      const devTypeLicense = { ...basicLicense, license_type_name: 'Development' };
      expect(isDevelopmentLicense(devTypeLicense)).toBe(true);
      
      const nestedDevTypeLicense = { 
        ...basicLicense, 
        license_type: { name: 'Development' } 
      };
      expect(isDevelopmentLicense(nestedDevTypeLicense)).toBe(true);
    });

    it('should return false for regular licenses', () => {
      expect(isDevelopmentLicense(basicLicense)).toBe(false);
      expect(isDevelopmentLicense(enterpriseLicense)).toBe(false);
    });
  });

  describe('ROUTE_FEATURE_MAP', () => {
    it('should have correct mappings for voice routes', () => {
      expect(ROUTE_FEATURE_MAP['/voice']).toBe(FEATURE_KEYS.CALLS);
      expect(ROUTE_FEATURE_MAP['/voice/recordings']).toBe(FEATURE_KEYS.RECORDING);
    });

    it('should have correct mappings for integration routes', () => {
      expect(ROUTE_FEATURE_MAP['/whatsapp']).toBe(FEATURE_KEYS.WHATSAPP);
      expect(ROUTE_FEATURE_MAP['/integrations/salesforceAccount']).toBe(FEATURE_KEYS.SALESFORCE);
    });

    it('should have null mappings for always-accessible routes', () => {
      expect(ROUTE_FEATURE_MAP['/dashboard']).toBeNull();
      expect(ROUTE_FEATURE_MAP['/settings']).toBeNull();
      expect(ROUTE_FEATURE_MAP['/profile']).toBeNull();
    });
  });

  describe('MENU_FEATURE_MAP', () => {
    it('should have correct mappings for feature-based menu items', () => {
      expect(MENU_FEATURE_MAP['whatsapp']).toBe(FEATURE_KEYS.WHATSAPP);
      expect(MENU_FEATURE_MAP['reports']).toBe(FEATURE_KEYS.REPORTS);
      expect(MENU_FEATURE_MAP['transferHistory']).toBe(FEATURE_KEYS.TRANSFERS);
    });

    it('should have null mappings for always-accessible menu items', () => {
      expect(MENU_FEATURE_MAP['dashboard']).toBeNull();
      expect(MENU_FEATURE_MAP['agentStatus']).toBeNull();
      expect(MENU_FEATURE_MAP['info']).toBeNull();
    });
  });
});
