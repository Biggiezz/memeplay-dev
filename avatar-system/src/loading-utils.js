// Loading Utilities - Show/hide loading indicator
// Used by avatar-creator.js and avatar-profile.js

/**
 * Show loading indicator
 * @param {HTMLElement} loadingIndicator - Loading indicator element (optional, will find by ID if not provided)
 */
export function showLoading(loadingIndicator = null) {
  const indicator = loadingIndicator || document.getElementById('loadingIndicator');
  if (indicator) {
    indicator.classList.add('active');
  }
}

/**
 * Hide loading indicator
 * @param {HTMLElement} loadingIndicator - Loading indicator element (optional, will find by ID if not provided)
 */
export function hideLoading(loadingIndicator = null) {
  const indicator = loadingIndicator || document.getElementById('loadingIndicator');
  if (indicator) {
    indicator.classList.remove('active');
  }
}

