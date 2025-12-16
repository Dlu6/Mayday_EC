// useStickyAppbar.js - React hook for sticky appbar functionality
import { useState, useEffect, useCallback } from 'react';
import { stickyAppbarService } from '../services/stickyAppbarService';
import APPBAR_CONFIG from '../config/appbarConfig';

/**
 * React hook for managing sticky appbar state
 * Provides toggle functionality and state tracking for the Windows AppBar feature
 */
export function useStickyAppbar(options = {}) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isNativeAvailable, setIsNativeAvailable] = useState(false);
  const [error, setError] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  
  // Default configuration - uses global APPBAR_CONFIG
  const config = {
    height: options.height || APPBAR_CONFIG.height,
    edge: options.edge || APPBAR_CONFIG.edge
  };
  
  // Check if service is available (running in Electron)
  const isAvailable = stickyAppbarService.isAvailable();
  
  // Initialize state from service
  useEffect(() => {
    if (!isAvailable) return;
    
    // Get initial state
    stickyAppbarService.getState().then(state => {
      setIsEnabled(state.isEnabled);
      setIsNativeAvailable(state.nativeModuleAvailable);
    });
    
    // Subscribe to state changes
    const unsubscribe = stickyAppbarService.subscribe(state => {
      setIsEnabled(state.isEnabled);
    });
    
    return unsubscribe;
  }, [isAvailable]);
  
  // Check native availability
  useEffect(() => {
    if (!isAvailable) return;
    
    stickyAppbarService.isNativeAvailable().then(available => {
      setIsNativeAvailable(available);
    });
  }, [isAvailable]);
  
  // Toggle sticky appbar
  const toggle = useCallback(async () => {
    if (!isAvailable) {
      setError('Not running in Electron');
      return { success: false, error: 'Not running in Electron' };
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await stickyAppbarService.toggle(config);
      setLastResult(result);
      
      if (!result.success) {
        setError(result.error || 'Failed to toggle appbar');
      }
      
      return result;
    } catch (err) {
      const errorMsg = err.message || 'Unknown error';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable, config]);
  
  // Enable sticky appbar
  const enable = useCallback(async (customConfig = {}) => {
    if (!isAvailable) {
      setError('Not running in Electron');
      return { success: false, error: 'Not running in Electron' };
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await stickyAppbarService.enable({
        ...config,
        ...customConfig
      });
      setLastResult(result);
      
      if (!result.success) {
        setError(result.error || 'Failed to enable appbar');
      }
      
      return result;
    } catch (err) {
      const errorMsg = err.message || 'Unknown error';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable, config]);
  
  // Disable sticky appbar
  const disable = useCallback(async () => {
    if (!isAvailable) {
      setError('Not running in Electron');
      return { success: false, error: 'Not running in Electron' };
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await stickyAppbarService.disable();
      setLastResult(result);
      
      if (!result.success) {
        setError(result.error || 'Failed to disable appbar');
      }
      
      return result;
    } catch (err) {
      const errorMsg = err.message || 'Unknown error';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable]);
  
  // Update position (for display changes)
  const updatePosition = useCallback(async () => {
    if (!isAvailable || !isEnabled) return { success: false };
    
    try {
      return await stickyAppbarService.updatePosition();
    } catch (err) {
      console.error('[useStickyAppbar] Failed to update position:', err);
      return { success: false, error: err.message };
    }
  }, [isAvailable, isEnabled]);
  
  return {
    // State
    isEnabled,
    isLoading,
    isAvailable,
    isNativeAvailable,
    error,
    lastResult,
    
    // Actions
    toggle,
    enable,
    disable,
    updatePosition
  };
}

export default useStickyAppbar;
