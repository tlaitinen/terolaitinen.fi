'use client';

import { useEffect } from 'react';

/**
 * Privacy-first analytics component.
 * 
 * Supports multiple privacy-respecting providers:
 * - 'none': No tracking (default)
 * - 'cloudflare': Cloudflare Web Analytics (no cookies, GDPR-friendly)
 * - 'custom': Send beacon to a custom endpoint (no cookies, no localStorage)
 * 
 * No cookies are used. No personal data is collected.
 * Respects Do Not Track (DNT) browser setting.
 */

interface AnalyticsConfig {
  provider: 'none' | 'cloudflare' | 'custom';
  /** Cloudflare Web Analytics token */
  cloudflareToken?: string;
  /** Custom endpoint URL for beacon-based tracking */
  customEndpoint?: string;
}

const CONFIG: AnalyticsConfig = {
  provider: 'none',
  // To enable Cloudflare Web Analytics, set:
  // provider: 'cloudflare',
  // cloudflareToken: 'YOUR_TOKEN_HERE',
};

function shouldTrack(): boolean {
  // Respect Do Not Track
  if (typeof navigator !== 'undefined' && navigator.doNotTrack === '1') {
    return false;
  }
  return true;
}

function trackCustomPageview(endpoint: string) {
  if (!shouldTrack()) return;

  const data = {
    u: window.location.href,
    r: document.referrer,
    w: window.innerWidth,
    d: document.title,
    t: Date.now(),
  };

  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, JSON.stringify(data));
    } else {
      fetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(data),
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
      }).catch(() => {
        // Silently fail - analytics should never break the app
      });
    }
  } catch {
    // Silently fail
  }
}

export default function Analytics() {
  useEffect(() => {
    if (CONFIG.provider === 'custom' && CONFIG.customEndpoint) {
      trackCustomPageview(CONFIG.customEndpoint);
    }
  }, []);

  if (CONFIG.provider === 'cloudflare' && CONFIG.cloudflareToken) {
    return (
      <script
        defer
        src="https://static.cloudflareinsights.com/beacon.min.js"
        data-cf-beacon={`{"token": "${CONFIG.cloudflareToken}"}`}
      />
    );
  }

  return null;
}
