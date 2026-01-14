/**
 * Global Appbar Configuration (Renderer Side)
 * Central place to configure the sticky appbar settings
 * 
 * IMPORTANT: The renderer uses CSS pixels which are already DPI-scaled by the browser.
 * We should NOT multiply by devicePixelRatio here - that's handled by Electron's main process.
 * The main process uses physical pixels, the renderer uses logical (CSS) pixels.
 */

// Fixed height in CSS pixels (logical pixels, not physical)
// This is the visual height the user sees - browser handles DPI scaling automatically
const TOOLBAR_HEIGHT = 48;
const BOTTOM_PADDING = 4;

export const APPBAR_CONFIG = {
  // Total height for the appbar window (toolbar + padding)
  // Main process will scale this by DPI when setting window bounds
  height: TOOLBAR_HEIGHT + BOTTOM_PADDING,
  
  // Edge where the appbar docks ('top' or 'bottom')
  edge: 'top',
  
  // Visual height of the toolbar content in CSS pixels
  toolbarHeight: TOOLBAR_HEIGHT,
  
  // Bottom padding/border to separate from other apps
  bottomPadding: BOTTOM_PADDING
};

export default APPBAR_CONFIG;
