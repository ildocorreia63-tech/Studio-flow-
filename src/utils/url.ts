/**
 * Utility to get the public, shareable base URL of the application.
 * In AI Studio, the development environment hostname contains 'ais-dev-',
 * which requires developer Google login authentication (producing Google 403 Forbidden for external users).
 * Replacing 'ais-dev-' with 'ais-pre-' generates the public preview URL that anyone can access without 403 error.
 */
export function getPublicAppBaseUrl(): string {
  if (typeof window === 'undefined') return '';

  let origin = window.location.origin;
  if (!origin || origin === 'null') {
    origin = `${window.location.protocol}//${window.location.host}`;
  }

  // 1. If running inside Google AI Studio dev instance, convert to public preview instance
  if (origin.includes('ais-dev-')) {
    origin = origin.replace('ais-dev-', 'ais-pre-');
  }

  // 2. If embedded in an iframe or on Google internal domain
  if (origin.includes('google.com')) {
    if (document.referrer && document.referrer.includes('run.app')) {
      try {
        const refUrl = new URL(document.referrer);
        origin = refUrl.origin.replace('ais-dev-', 'ais-pre-');
      } catch {
        // keep origin
      }
    }
  }

  return origin.replace(/\/$/, '');
}

/**
 * Returns full shareable public URL for booking
 */
export function getPublicBookingUrl(slug?: string): string {
  const base = getPublicAppBaseUrl();
  const cleanSlug = (slug || 'studioflow-demo').trim();
  return `${base}/?agendar=${cleanSlug}`;
}

/**
 * Returns full shareable public URL for subscription plans
 */
export function getPublicPlansUrl(): string {
  const base = getPublicAppBaseUrl();
  return `${base}/?planos=true`;
}

