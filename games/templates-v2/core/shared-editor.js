import { buildPublicLinkUrl } from './url-builder.js';

/**
 * Shared editor behaviors for desktop/mobile flows.
 */
export class SharedEditor {
  constructor(adapter = null) {
    this.currentAdapter = adapter;
  }

  setAdapter(adapter) {
    this.currentAdapter = adapter;
  }

  async handleSaveAndCopy() {
    this.#ensureAdapter();
    const result = await this.currentAdapter.save();
    const gameId = result.gameId;
    const publicUrl = buildPublicLinkUrl(gameId);
    await this.copyToClipboard(publicUrl);
    this.enablePublicLinkButton(gameId, publicUrl);
    return { gameId, publicUrl };
  }

  async handleSaveAndCopyMobile() {
    this.#ensureAdapter();
    const result = await this.currentAdapter.save();
    const gameId = result.gameId;
    const publicUrl = buildPublicLinkUrl(gameId);
    await this.copyToClipboard(publicUrl);
    return { gameId, publicUrl };
  }

  enablePublicLinkButton(gameId, publicUrl) {
    // No-op by default; UI layer can override.
    void gameId;
    void publicUrl;
  }

  async copyToClipboard(text) {
    if (!text) return false;

    // ✅ Try modern Clipboard API first
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_) {
      // fallback below
    }

    // ✅ Fallback: Use textarea method (works better on mobile)
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.setAttribute('aria-hidden', 'true');
    
    // ✅ Critical for mobile: Must be visible (opacity 0.01) and in viewport
    const isMobile = /ipad|iphone|android/i.test(navigator.userAgent);
    if (isMobile) {
      // Mobile: visible but almost transparent, in viewport center
      textarea.style.position = 'fixed';
      textarea.style.top = '50%';
      textarea.style.left = '50%';
      textarea.style.width = '1px';
      textarea.style.height = '1px';
      textarea.style.padding = '0';
      textarea.style.border = 'none';
      textarea.style.outline = 'none';
      textarea.style.boxShadow = 'none';
      textarea.style.background = 'transparent';
      textarea.style.opacity = '0.01'; // Almost invisible but iOS allows copy
      textarea.style.zIndex = '9999';
    } else {
      // Desktop: fully invisible
      textarea.style.position = 'fixed';
      textarea.style.top = '0';
      textarea.style.left = '0';
      textarea.style.width = '2em';
      textarea.style.height = '2em';
      textarea.style.padding = '0';
      textarea.style.border = 'none';
      textarea.style.outline = 'none';
      textarea.style.boxShadow = 'none';
      textarea.style.background = 'transparent';
      textarea.style.opacity = '0';
    }
    
    document.body.appendChild(textarea);
    
    // ✅ Critical: Focus first, then select
    textarea.focus();
    
    // ✅ For mobile: select and copy
    if (navigator.userAgent.match(/ipad|iphone/i)) {
      // iOS specific
      textarea.setSelectionRange(0, text.length);
      const range = document.createRange();
      range.selectNodeContents(textarea);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      textarea.select();
      textarea.setSelectionRange(0, text.length);
    }
    
    try {
      const success = document.execCommand('copy');
      // ✅ Small delay before removing (for mobile)
      if (isMobile) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      textarea.remove();
      return success;
    } catch (err) {
      textarea.remove();
      return false;
    }
  }

  #ensureAdapter() {
    if (!this.currentAdapter) {
      throw new Error('SharedEditor: no adapter attached');
    }
  }
}



